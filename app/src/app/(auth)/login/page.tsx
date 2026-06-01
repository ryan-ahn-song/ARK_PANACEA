"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // /auth/callback 에서 실패 시 ?error= 파라미터로 돌아옴
  const callbackError = searchParams.get("error");
  const callbackErrorMsg =
    callbackError === "auth_failed" ? "Link expired or already used. Request a new code." :
    callbackError === "missing_code" ? "Invalid login link. Please request a new one." :
    null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        // 이메일 링크 클릭 시 /auth/callback 으로 리다이렉트
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // 이메일을 Verify 페이지로 전달
    sessionStorage.setItem("otp_email", email.trim().toLowerCase());
    setSent(true);
    setLoading(false);

    // 잠깐 성공 메시지 보여준 후 이동
    setTimeout(() => router.push("/auth/verify"), 1200);
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center overflow-hidden relative">
      {/* Atmospheric orbs */}
      <div className="absolute w-[400px] h-[400px] rounded-full -top-24 -left-24 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)", filter: "blur(40px)", animation: "float 20s ease-in-out infinite alternate" }} />
      <div className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -right-24 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)", filter: "blur(40px)", animation: "float 20s ease-in-out infinite alternate", animationDelay: "-5s" }} />

      <main className="w-full max-w-[440px] px-6 py-12 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-white text-[28px]">favorite</span>
          </div>
          <h1 className="font-serif font-semibold text-2xl tracking-tight text-black mb-1">PANACEA</h1>
          <p className="font-sans text-xs font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">Secure Access</p>
        </div>

        {/* Glass card */}
        <div className="rounded-[40px] p-10 border border-[#cfc4c5]"
          style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>

          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-[#f3f3f4] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-black text-[28px]">mail</span>
            </div>
            <h2 className="font-serif font-medium text-2xl mb-1">Welcome back</h2>
            <p className="font-sans text-xs text-[#5e5e5e] tracking-wide text-center">
              Enter your email to receive a secure access code
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email input */}
            <div className="relative">
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

            {(error || callbackErrorMsg) && (
              <p className="font-sans text-xs text-[#ba1a1a] text-center">
                {error || callbackErrorMsg}
              </p>
            )}

            {sent && (
              <div className="flex items-center justify-center gap-2 text-[#50a14f]">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="font-sans text-xs font-semibold tracking-wide">Code sent! Redirecting...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || sent || !email.trim()}
              className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95 disabled:opacity-40"
            >
              {loading ? "Sending..." : sent ? "Code Sent ✓" : "Request Access"}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-8 pt-6 border-t border-[#cfc4c5] flex items-start gap-3">
            <span className="material-symbols-outlined text-[#5e5e5e] text-sm mt-0.5">lock</span>
            <p className="font-sans text-[10px] text-[#5e5e5e] leading-relaxed">
              A one-time 6-digit code will be sent to your inbox. No password required. Code expires in 10 minutes.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex justify-center gap-8">
          <a href="#" className="font-sans text-xs font-semibold tracking-[0.2em] text-[#5e5e5e] hover:text-black transition-colors">Help</a>
          <a href="#" className="font-sans text-xs font-semibold tracking-[0.2em] text-[#5e5e5e] hover:text-black transition-colors">Privacy</a>
        </div>
      </main>

      {/* Editorial aside */}
      <aside className="hidden lg:block fixed left-16 bottom-16 max-w-[280px]">
        <h2 className="font-serif text-[42px] font-light leading-tight mb-4">Protecting what matters most.</h2>
        <div className="h-px w-24 bg-black mb-4" />
        <p className="font-sans text-base text-[#5e5e5e] opacity-60">PANACEA Digital Health — Built for secure, accessible intelligence in clinical diagnostics.</p>
      </aside>

      <style>{`
        @keyframes float {
          0% { transform: translate(-10%,-10%) scale(1); }
          100% { transform: translate(10%,10%) scale(1.1); }
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
