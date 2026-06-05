"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot";

/* ─── 이메일 전송 완료 화면 ─── */
function InboxScreen({
  email,
  kind,
  onBack,
}: {
  email: string;
  kind: "signup" | "forgot";
  onBack: () => void;
}) {
  const steps =
    kind === "signup"
      ? [
          ["mail", "이메일 앱을 열어주세요"],
          ["verified_user", "인증 링크를 클릭해주세요"],
          ["lock", "돌아와서 로그인하세요"],
        ]
      : [
          ["mail", "이메일 앱을 열어주세요"],
          ["lock_reset", "비밀번호 재설정 링크를 클릭해주세요"],
          ["password", "새 비밀번호를 설정하세요"],
        ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center px-6">
      <div className="w-full max-w-[440px] flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-8">
          <span
            className="material-symbols-outlined text-white text-[36px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_read
          </span>
        </div>

        <h1 className="font-serif font-light text-[38px] leading-tight mb-3">
          Check your inbox
        </h1>
        <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-10">
          {kind === "signup" ? "Verification Link Sent" : "Reset Link Sent"}
        </p>

        <div className="w-full rounded-[32px] border border-[#cfc4c5] p-10 bg-white space-y-6">
          <p className="font-sans text-sm text-[#1a1c1c] leading-relaxed">
            We sent a link to
            <br />
            <strong className="font-semibold">{email}</strong>
          </p>

          <div className="flex flex-col gap-3 text-left">
            {steps.map(([icon, text]) => (
              <div key={icon} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-black text-[16px]">
                    {icon}
                  </span>
                </div>
                <p className="font-sans text-sm text-[#5e5e5e]">{text}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#e8e8e8]">
            <p className="font-sans text-xs text-[#5e5e5e] mb-3">
              이메일을 받지 못하셨나요?
            </p>
            <button
              onClick={onBack}
              className="w-full py-3 rounded-full border border-[#cfc4c5] font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e] hover:border-black hover:text-black transition-colors"
            >
              Try a different email
            </button>
          </div>
        </div>

        <p className="font-sans text-[10px] text-[#9e9e9e] mt-8">
          Link expires in 60 minutes
        </p>
      </div>
    </div>
  );
}

/* ─── 메인 폼 ─── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sentKind, setSentKind] = useState<"signup" | "forgot">("signup");

  /* URL 파라미터 배너 */
  const verified = searchParams.get("verified");
  const passwordUpdated = searchParams.get("password_updated");
  const callbackError = searchParams.get("error");

  const bannerSuccess =
    verified === "1"
      ? "이메일 인증 완료! 로그인해주세요."
      : passwordUpdated === "1"
      ? "비밀번호가 변경되었습니다. 다시 로그인해주세요."
      : null;

  const bannerError =
    error ||
    (callbackError === "auth_failed"
      ? "인증에 실패했습니다. 다시 시도해주세요."
      : callbackError === "missing_code"
      ? "유효하지 않은 링크입니다. 새 링크를 요청해주세요."
      : null);

  function switchMode(m: Mode) {
    setMode(m);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setEmailSent(false);
  }

  /* ── 로그인 ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (err) {
      setError(
        err.message.includes("Invalid login credentials")
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : err.message
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  /* ── 회원가입 ── */
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSentKind("signup");
    setEmailSent(true);
    setLoading(false);
  }

  /* ── 비밀번호 찾기 ── */
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback?type=reset`,
      }
    );

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSentKind("forgot");
    setEmailSent(true);
    setLoading(false);
  }

  /* ── 이메일 전송 완료 화면 ── */
  if (emailSent) {
    return (
      <InboxScreen
        email={email}
        kind={sentKind}
        onBack={() => setEmailSent(false)}
      />
    );
  }

  /* ── 모드별 메타 ── */
  type MetaEntry = {
    icon: string;
    subtitle: string;
    cardTitle: string;
    cardSub: string;
    btnLabel: string;
    onSubmit: (e: React.FormEvent) => Promise<void>;
  };

  const meta: MetaEntry = {
    login: {
      icon: "lock",
      subtitle: "Secure Access",
      cardTitle: "Sign In",
      cardSub: "Enter your credentials to continue",
      btnLabel: loading ? "Signing in..." : "Sign In",
      onSubmit: handleLogin,
    },
    signup: {
      icon: "person_add",
      subtitle: "Join PANACEA",
      cardTitle: "Sign Up",
      cardSub: "Create your secure health account",
      btnLabel: loading ? "Creating account..." : "Create Account",
      onSubmit: handleSignup,
    },
    forgot: {
      icon: "lock_reset",
      subtitle: "Account Recovery",
      cardTitle: "Forgot Password",
      cardSub: "Enter your email to receive a reset link",
      btnLabel: loading ? "Sending..." : "Send Reset Link",
      onSubmit: handleForgot,
    },
  }[mode];

  const pageTitle = {
    login: "Welcome Back",
    signup: "Create Account",
    forgot: "Reset Password",
  }[mode];

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center overflow-hidden relative px-6">
      {/* 배경 블롭 */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full -top-24 -left-24 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "float 20s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -right-24 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "float 20s ease-in-out infinite alternate",
          animationDelay: "-5s",
        }}
      />

      <main className="w-full max-w-[440px] py-12 relative z-10">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-white text-[28px]">
              favorite
            </span>
          </div>
          <h1 className="font-serif font-semibold text-2xl tracking-tight text-black mb-1">
            PANACEA
          </h1>
          <p className="font-sans text-xs font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">
            {meta.subtitle}
          </p>
        </div>

        {/* 성공 배너 */}
        {bannerSuccess && (
          <div className="mb-4 px-5 py-3 rounded-2xl bg-[#e6f4ea] border border-[#b7dfc0]">
            <p className="font-sans text-xs text-center text-[#1e5631]">
              ✓ {bannerSuccess}
            </p>
          </div>
        )}

        {/* 카드 */}
        <div
          className="rounded-[40px] p-10 border border-[#cfc4c5]"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* 카드 헤더 */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#f3f3f4] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-black text-[28px]">
                {meta.icon}
              </span>
            </div>
            <h2 className="font-serif font-medium text-2xl mb-1">{pageTitle}</h2>
            <p className="font-sans text-xs text-[#5e5e5e] tracking-wide text-center">
              {meta.cardSub}
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={meta.onSubmit} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-white/60 font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* 비밀번호 (로그인 / 회원가입) */}
            {mode !== "forgot" && (
              <div>
                <label className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder={mode === "signup" ? "최소 8자 이상" : "••••••••"}
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-white/60 font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
                />
              </div>
            )}

            {/* 비밀번호 확인 (회원가입) */}
            {mode === "signup" && (
              <div>
                <label className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="비밀번호 재입력"
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-white/60 font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
                />
              </div>
            )}

            {/* 에러 메시지 */}
            {bannerError && (
              <p className="font-sans text-xs text-[#ba1a1a] text-center">
                {bannerError}
              </p>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95 disabled:opacity-40 mt-2"
            >
              {meta.btnLabel}
            </button>
          </form>

          {/* 모드 전환 링크 */}
          <div className="mt-6 pt-5 border-t border-[#e8e8e8] flex flex-col gap-3 items-center">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="font-sans text-xs text-[#5e5e5e] hover:text-black transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-sans text-xs font-semibold text-black hover:underline transition-colors"
                >
                  계정 만들기 →
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-sans text-xs text-[#5e5e5e] hover:text-black transition-colors"
              >
                이미 계정이 있으신가요?{" "}
                <span className="font-semibold text-black">로그인 →</span>
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-sans text-xs text-[#5e5e5e] hover:text-black transition-colors"
              >
                ← 로그인으로 돌아가기
              </button>
            )}
          </div>
        </div>

        {/* 보안 안내 */}
        <div className="mt-6 flex items-start gap-3 px-2">
          <span className="material-symbols-outlined text-[#5e5e5e] text-sm mt-0.5">
            lock
          </span>
          <p className="font-sans text-[10px] text-[#5e5e5e] leading-relaxed">
            모든 데이터는 암호화되어 안전하게 보호됩니다. No password is stored in plain text.
          </p>
        </div>
      </main>

      {/* 사이드 카피 (lg+) */}
      <aside className="hidden lg:block fixed left-16 bottom-16 max-w-[280px]">
        <h2 className="font-serif text-[42px] font-light leading-tight mb-4">
          Protecting what matters most.
        </h2>
        <div className="h-px w-24 bg-black mb-4" />
        <p className="font-sans text-base text-[#5e5e5e] opacity-60">
          PANACEA Digital Health — Secure, accessible health intelligence.
        </p>
      </aside>

      <style>{`
        @keyframes float {
          0%   { transform: translate(-10%, -10%) scale(1); }
          100% { transform: translate(10%, 10%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
