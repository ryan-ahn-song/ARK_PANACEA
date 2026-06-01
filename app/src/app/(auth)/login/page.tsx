"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const supabase = createClient();

  const callbackError = searchParams.get("error");
  const callbackErrorMsg =
    callbackError === "auth_failed" ? "Link expired or already used. Please request a new one." :
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center px-6">
        <div className="w-full max-w-[440px] flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-8">
            <span className="material-symbols-outlined text-white text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
          </div>

          <h1 className="font-serif font-light text-[38px] leading-tight mb-3">Check your inbox</h1>
          <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-10">Magic Link Sent</p>

          <div className="w-full rounded-[32px] border border-[#cfc4c5] p-10 bg-white space-y-6">
            <p className="font-sans text-sm text-[#1a1c1c] leading-relaxed">
              We sent a login link to<br />
              <strong className="font-semibold">{email}</strong>
            </p>

            <div className="flex flex-col gap-3 text-left">
              {[
                ["mail", "Open your email app"],
                ["touch_app", "Click the login link"],
                ["favorite", "You're in — no password needed"],
              ].map(([icon, text]) => (
                <div key={icon} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-black text-[16px]">{icon}</span>
                  </div>
                  <p className="font-sans text-sm text-[#5e5e5e]">{text}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#e8e8e8]">
              <p className="font-sans text-xs text-[#5e5e5e] mb-3">Didn&apos;t receive it?</p>
              <button
                onClick={() => { setSent(false); setError(""); }}
                className="w-full py-3 rounded-full border border-[#cfc4c5] font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e] hover:border-black hover:text-black transition-colors"
              >
                Try a different email
              </button>
            </div>
          </div>

          <p className="font-sans text-[10px] text-[#9e9e9e] mt-8">Link expires in 10 minutes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center overflow-hidden relative">
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

        {/* Card */}
        <div className="rounded-[40px] p-10 border border-[#cfc4c5]"
          style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>

          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-[#f3f3f4] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-black text-[28px]">mail</span>
            </div>
            <h2 className="font-serif font-medium text-2xl mb-1">Welcome</h2>
            <p className="font-sans text-xs text-[#5e5e5e] tracking-wide text-center">
              Enter your email — we&apos;ll send you a login link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {(error || callbackErrorMsg) && (
              <p className="font-sans text-xs text-[#ba1a1a] text-center">{error || callbackErrorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95 disabled:opacity-40"
            >
              {loading ? "Sending..." : "Send Login Link"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#cfc4c5] flex items-start gap-3">
            <span className="material-symbols-outlined text-[#5e5e5e] text-sm mt-0.5">lock</span>
            <p className="font-sans text-[10px] text-[#5e5e5e] leading-relaxed">
              A secure link will be sent to your inbox. No password required. Link expires in 10 minutes.
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-8">
          <a href="#" className="font-sans text-xs font-semibold tracking-[0.2em] text-[#5e5e5e] hover:text-black transition-colors">Help</a>
          <a href="#" className="font-sans text-xs font-semibold tracking-[0.2em] text-[#5e5e5e] hover:text-black transition-colors">Privacy</a>
        </div>
      </main>

      <aside className="hidden lg:block fixed left-16 bottom-16 max-w-[280px]">
        <h2 className="font-serif text-[42px] font-light leading-tight mb-4">Protecting what matters most.</h2>
        <div className="h-px w-24 bg-black mb-4" />
        <p className="font-sans text-base text-[#5e5e5e] opacity-60">PANACEA Digital Health — Secure, accessible health intelligence.</p>
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
