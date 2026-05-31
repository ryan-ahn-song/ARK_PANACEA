"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendSec, setResendSec] = useState(56);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 초기값을 sessionStorage에서 직접 읽어 effect 내 setState 호출 제거
  const [email] = useState<string>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("otp_email") ?? "" : ""
  );
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!email) { router.push("/login"); return; }
    inputs.current[0]?.focus();
  }, [email, router]);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  function handleInput(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((c) => c !== "") && val) submit(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setCode(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
    if (pasted.length === 6) submit(pasted);
  }

  async function submit(token: string) {
    if (!email) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (err) {
      setError("Invalid or expired code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setLoading(false);
      return;
    }

    sessionStorage.removeItem("otp_email");
    router.push("/dashboard");
  }

  async function resend() {
    if (!email) return;
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setResendSec(56);
    setCode(["", "", "", "", "", ""]);
    setError("");
    inputs.current[0]?.focus();
  }

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c)
    : "your inbox";

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      {/* Atmospheric blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full -top-32 -left-32 bg-[#e2e2e2]/50" style={{ filter: "blur(80px)" }} />
        <div className="absolute w-96 h-96 rounded-full -bottom-32 -right-32 bg-[#e2e2e2]/50" style={{ filter: "blur(80px)" }} />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Shield icon */}
        <div className="w-16 h-16 rounded-full bg-[#eeeeee] flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-black text-[28px]">security</span>
        </div>

        <h1 className="font-serif font-light text-[42px] leading-[1.3] text-center mb-2">Security Verification</h1>
        <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-12">One-Time Access Code</p>

        {/* Card */}
        <div className="w-full max-w-[500px] rounded-[20px] border border-[#cfc4c5] p-10 bg-white relative">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px] overflow-hidden">
            <div className="h-full bg-black w-2/3 transition-all" />
          </div>

          <div className="flex flex-col items-center gap-8">
            {/* Mail icon */}
            <div className="w-20 h-20 rounded-2xl bg-[#f3f3f4] flex items-center justify-center">
              <span className="material-symbols-outlined text-black text-[36px]">mark_email_read</span>
            </div>

            <p className="font-sans text-base text-center text-[#1a1c1c]">
              We&apos;ve sent a 6-digit code to <strong>{maskedEmail}</strong>
            </p>

            {/* OTP inputs — 6자리 */}
            <div className="flex gap-3" onPaste={handlePaste}>
              {code.map((val, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center font-serif text-2xl font-medium border border-[#cfc4c5] rounded-xl focus:border-black focus:outline-none transition-colors bg-transparent"
                />
              ))}
            </div>

            {error && <p className="text-xs text-[#ba1a1a] font-sans text-center">{error}</p>}

            <button
              onClick={() => code.every((c) => c) && submit(code.join(""))}
              disabled={loading || code.some((c) => !c)}
              className="w-full py-4 rounded-full bg-[#5e5e5e] text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors disabled:opacity-40"
            >
              {loading ? "Verifying..." : "Verify Identity"}
            </button>

            <button
              disabled={resendSec > 0}
              onClick={resend}
              className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] hover:text-black transition-colors disabled:opacity-40"
            >
              {resendSec > 0 ? `Resend Code in ${resendSec}s` : "Resend Code"}
            </button>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-12 flex items-center gap-12">
          <button className="flex flex-col items-center gap-1 text-[#5e5e5e] hover:text-black transition-colors">
            <span className="material-symbols-outlined">help_outline</span>
            <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase">Support</span>
          </button>
          <div className="flex flex-col items-center gap-1">
            <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">PANACEA Digital Health</span>
            <span className="material-symbols-outlined text-[#5e5e5e]">developer_board</span>
            <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">Secure Access</span>
          </div>
          <button className="flex flex-col items-center gap-1 text-[#5e5e5e] hover:text-black transition-colors"
            onClick={() => router.push("/login")}>
            <span className="material-symbols-outlined">logout</span>
            <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase">Cancel</span>
          </button>
        </div>
      </main>

      {/* Security metadata — left side */}
      <div className="hidden lg:flex fixed left-12 top-1/2 -translate-y-1/2 flex-col gap-8">
        {[["Identity", "Email OTP"], ["Session", "Supabase Auth"], ["Access", "Verified"]].map(([label, val]) => (
          <div key={label}>
            <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">{label}</p>
            <p className="font-serif font-medium text-xl text-black">{val}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex justify-between items-center px-16 py-6 border-t border-[#e8e8e8]">
        <span className="font-serif font-semibold text-lg text-black">PANACEA</span>
        <p className="font-sans text-xs text-[#5e5e5e]">© 2025 PANACEA Digital Health</p>
        <div className="flex gap-8">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a key={l} href="#" className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] hover:text-black transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
