"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * /auth/new-password
 * 비밀번호 재설정 링크 클릭 후 도달하는 페이지.
 * 콜백 라우트에서 이미 세션이 교환되었으므로 새 비밀번호를 입력받아 업데이트한다.
 */
export default function NewPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // 세션 확인 — 직접 접근 방지
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login?error=auth_failed");
        return;
      }
      setReady(true);
    });
  }, [supabase, router]);

  // 완료 후 3초 뒤 로그인 페이지로
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(async () => {
      await supabase.auth.signOut();
      router.push("/login?password_updated=1");
    }, 3000);
    return () => clearTimeout(t);
  }, [done, supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
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

    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col items-center justify-center px-6">
      {/* 배경 블롭 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full -top-32 -left-32 bg-[#e2e2e2]/50"
          style={{ filter: "blur(80px)" }}
        />
        <div
          className="absolute w-96 h-96 rounded-full -bottom-32 -right-32 bg-[#e2e2e2]/50"
          style={{ filter: "blur(80px)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[480px]">
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
            Account Recovery
          </p>
        </div>

        {!done ? (
          /* ── 비밀번호 입력 폼 ── */
          <div className="w-full rounded-[40px] border border-[#cfc4c5] p-10 bg-white">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#f3f3f4] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-black text-[28px]">
                  password
                </span>
              </div>
              <h2 className="font-serif font-medium text-2xl mb-1">
                New Password
              </h2>
              <p className="font-sans text-xs text-[#5e5e5e] tracking-wide text-center">
                새로운 비밀번호를 설정해주세요
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2 block">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="최소 8자 이상"
                  required
                  autoFocus
                  className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-[#f9f9f9] font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
                />
              </div>

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
                  className="w-full px-5 py-4 rounded-2xl border border-[#cfc4c5] bg-[#f9f9f9] font-sans text-sm text-black placeholder:text-[#9e9e9e] focus:outline-none focus:border-black transition-colors"
                />
              </div>

              {error && (
                <p className="font-sans text-xs text-[#ba1a1a] text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95 disabled:opacity-40 mt-2"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        ) : (
          /* ── 완료 화면 ── */
          <div className="w-full rounded-[40px] border border-[#cfc4c5] p-10 bg-white flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center animate-pulse">
              <span
                className="material-symbols-outlined text-white text-[36px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div>
              <h2 className="font-serif font-light text-[32px] mb-2">
                Password Updated
              </h2>
              <p className="font-sans text-sm text-[#5e5e5e]">
                3초 후 로그인 페이지로 이동합니다...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
