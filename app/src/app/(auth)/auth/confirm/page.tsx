"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();
  const supabase = createClient();

  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [email, setEmail] = useState("");

  // Verify session — prevent direct access
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login?error=auth_failed");
        return;
      }
      setEmail(user.email ?? "");
    });
  }, [supabase, router]);

  // Countdown after confirm button is clicked
  useEffect(() => {
    if (!confirmed) return;
    if (countdown <= 0) {
      router.push("/dashboard");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmed, countdown, router]);

  function handleConfirm() {
    setConfirmed(true);
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col items-center justify-center px-6">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full -top-32 -left-32 bg-[#e2e2e2]/50" style={{ filter: "blur(80px)" }} />
        <div className="absolute w-96 h-96 rounded-full -bottom-32 -right-32 bg-[#e2e2e2]/50" style={{ filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center text-center">

        {!confirmed ? (
          <>
            {/* Verified icon */}
            <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center mb-8">
              <span
                className="material-symbols-outlined text-white text-[44px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
            </div>

            <h1 className="font-serif font-light text-[42px] leading-tight mb-3">
              Identity Verified
            </h1>
            <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-10">
              Authentication Complete
            </p>

            {/* Card */}
            <div className="w-full rounded-[28px] border border-[#cfc4c5] p-10 bg-white space-y-8">
              {email && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#f3f3f4]">
                  <span className="material-symbols-outlined text-black text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                  <p className="font-sans text-sm text-[#1a1c1c] truncate">{email}</p>
                </div>
              )}

              <div className="space-y-3 text-left">
                {[
                  ["check_circle", "Email verified"],
                  ["check_circle", "Session created"],
                  ["check_circle", "Ready to enter"],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-black text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {icon}
                    </span>
                    <p className="font-sans text-sm text-[#1a1c1c]">{text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95"
              >
                Enter PANACEA
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center mb-8 animate-pulse">
              <span
                className="material-symbols-outlined text-white text-[44px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>

            <h1 className="font-serif font-light text-[42px] leading-tight mb-3">
              Welcome
            </h1>
            <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-10">
              Entering Dashboard
            </p>

            <div className="w-full rounded-[28px] border border-[#cfc4c5] p-10 bg-white flex flex-col items-center gap-6">
              {/* Countdown ring */}
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e8e8e8" strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r="40"
                    fill="none"
                    stroke="black"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (countdown / 3)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-serif text-3xl font-medium">{countdown}</span>
                </div>
              </div>

              <p className="font-sans text-sm text-[#5e5e5e]">
                Redirecting to your dashboard...
              </p>

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95"
              >
                Go Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
