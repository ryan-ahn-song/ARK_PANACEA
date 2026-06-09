"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot";

/* ─── Inbox screen (after email sent) ─── */
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
          ["mail", "Open your email app"],
          ["verified_user", "Click the verification link"],
          ["lock", "Return here and sign in"],
        ]
      : [
          ["mail", "Open your email app"],
          ["lock_reset", "Click the password reset link"],
          ["password", "Set your new password"],
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
              Didn&apos;t receive it?
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

/* ─── Main form ─── */
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

  /* URL param banners */
  const verified = searchParams.get("verified");
  const passwordUpdated = searchParams.get("password_updated");
  const callbackError = searchParams.get("error");

  const bannerSuccess =
    verified === "1"
      ? "Email verified! You can now sign in."
      : passwordUpdated === "1"
      ? "Password updated! Please sign in with your new password."
      : null;

  const bannerError =
    error ||
    (callbackError === "auth_failed"
      ? "Authentication failed. Please try again."
      : callbackError === "missing_code"
      ? "Invalid link. Please request a new one."
      : null);

  function switchMode(m: Mode) {
    setMode(m);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setEmailSent(false);
  }

  /* ── Sign in ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err, data: authData } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (err) {
      setError(
        err.message.includes("Invalid login credentials")
          ? "Incorrect email or password."
          : err.message.includes("Email not confirmed")
          ? "Please verify your email before signing in."
          : err.message
      );
      setLoading(false);
      return;
    }

    // Ensure a profiles row exists for new users (idempotent upsert)
    if (authData?.user) {
      try {
        await supabase.from("profiles").upsert(
          { id: authData.user.id, xp: 0, guardian_level: 1 },
          { onConflict: "id", ignoreDuplicates: true },
        );
      } catch {
        /* silent — profile row may already exist via DB trigger */
      }
    }

    // refresh() forces Next.js to re-run middleware with the new session cookies
    // before navigating — without this, the App Router may serve a cached
    // unauthenticated response and the redirect silently fails
    router.refresh();
    router.push("/dashboard");
  }

  /* ── Sign up ── */
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
      // Do not expose raw Supabase error strings — they may leak internal details
      setError("Unable to create account. Please check your email and try again.");
      setLoading(false);
      return;
    }

    setSentKind("signup");
    setEmailSent(true);
    setLoading(false);
  }

  /* ── Forgot password ── */
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
      // Do not expose raw Supabase error strings — they may leak internal details
      setError("Unable to send reset link. Please check your email and try again.");
      setLoading(false);
      return;
    }

    setSentKind("forgot");
    setEmailSent(true);
    setLoading(false);
  }

  /* ── Inbox screen ── */
  if (emailSent) {
    return (
      <InboxScreen
        email={email}
        kind={sentKind}
        onBack={() => setEmailSent(false)}
      />
    );
  }

  /* ── Mode meta ── */
  type MetaEntry = {
    icon: string;
    subtitle: string;
    cardSub: string;
    btnLabel: string;
    onSubmit: (e: React.FormEvent) => Promise<void>;
  };

  const meta: MetaEntry = {
    login: {
      icon: "lock",
      subtitle: "Secure Access",
      cardSub: "Enter your credentials to continue",
      btnLabel: loading ? "Signing in..." : "Sign In",
      onSubmit: handleLogin,
    },
    signup: {
      icon: "person_add",
      subtitle: "Join PANACEA",
      cardSub: "Create your secure health account",
      btnLabel: loading ? "Creating account..." : "Create Account",
      onSubmit: handleSignup,
    },
    forgot: {
      icon: "lock_reset",
      subtitle: "Account Recovery",
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
      {/* Background blobs */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full -top-24 -left-24 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "float-blob 20s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -right-24 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "float-blob 20s ease-in-out infinite alternate",
          animationDelay: "-5s",
        }}
      />

      <main className="w-full max-w-[440px] py-12 relative z-10">
        {/* Logo */}
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

        {/* Success banner */}
        {bannerSuccess && (
          <div className="mb-4 px-5 py-3 rounded-2xl bg-[#e6f4ea] border border-[#b7dfc0]">
            <p className="font-sans text-xs text-center text-[#1e5631]">
              ✓ {bannerSuccess}
            </p>
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-[40px] p-10 border border-[#cfc4c5]"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Card header */}
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

          {/* Form */}
          <form onSubmit={meta.onSubmit} className="space-y-4">
            {/* Email */}
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

            {/* Password (login / signup) */}
            {mode !== "forgot" && (
              <div>
                <label className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-white/60 font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
                />
              </div>
            )}

            {/* Confirm password (signup) */}
            {mode === "signup" && (
              <div>
                <label className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Re-enter your password"
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-white/60 font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
                />
              </div>
            )}

            {/* Error */}
            {bannerError && (
              <p className="font-sans text-xs text-[#ba1a1a] text-center">
                {bannerError}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95 disabled:opacity-40 mt-2"
            >
              {meta.btnLabel}
            </button>
          </form>

          {/* Mode switcher */}
          <div className="mt-6 pt-5 border-t border-[#e8e8e8] flex flex-col gap-3 items-center">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="font-sans text-xs text-[#5e5e5e] hover:text-black transition-colors"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-sans text-xs font-semibold text-black hover:underline transition-colors"
                >
                  Create an account →
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-sans text-xs text-[#5e5e5e] hover:text-black transition-colors"
              >
                Already have an account?{" "}
                <span className="font-semibold text-black">Sign in →</span>
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-sans text-xs text-[#5e5e5e] hover:text-black transition-colors"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 flex items-start gap-3 px-2">
          <span className="material-symbols-outlined text-[#5e5e5e] text-sm mt-0.5">
            lock
          </span>
          <p className="font-sans text-[10px] text-[#5e5e5e] leading-relaxed">
            All data is encrypted and securely protected. No password is stored in plain text.
          </p>
        </div>
      </main>

      {/* Side copy (lg+) */}
      <aside className="hidden lg:block fixed left-16 bottom-16 max-w-[280px]">
        <h2 className="font-serif text-[42px] font-light leading-tight mb-4">
          Protecting what matters most.
        </h2>
        <div className="h-px w-24 bg-black mb-4" />
        <p className="font-sans text-base text-[#5e5e5e] opacity-60">
          PANACEA Digital Health — Secure, accessible health intelligence.
        </p>
      </aside>

      {/* Keyframe animations are defined in globals.css */}
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
