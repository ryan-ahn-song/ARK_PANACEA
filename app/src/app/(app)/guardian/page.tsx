"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mission } from "@/lib/supabase/types";

const XP_PER_LEVEL = 500;

const REWARDS = [
  { icon: "grid_view",     title: "Mosquito Net",      sub: "Voucher: #PAN-MN-442",    code: "PAN-MN-442",  xpRequired: 100 },
  { icon: "clean_hands",   title: "Antiseptic Soap",   sub: "3 Units Available",        code: "PAN-AS-103",  xpRequired: 200 },
  { icon: "medication",    title: "Essential Medicine", sub: "Claim at Local Clinic",    code: "PAN-EM-881",  xpRequired: 400 },
];

/** Format seconds until midnight as "Xh Ym Zs" */
function formatCountdown(secondsLeft: number): string {
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

export default function GuardianPage() {
  const supabase = createClient();

  const [missions,       setMissions]       = useState<Mission[]>([]);
  const [completedIds,   setCompletedIds]   = useState<Set<string>>(new Set());
  const [userId,         setUserId]         = useState<string | null>(null);
  const [savingId,       setSavingId]       = useState<string | null>(null);
  const [baseXp,         setBaseXp]         = useState(0);
  const [toast,          setToast]          = useState("");
  const [showRedeem,     setShowRedeem]     = useState(false);
  const [copySuccess,    setCopySuccess]    = useState<string | null>(null);

  // ── Item 5: Redeemed codes from DB ─────────────────────────────────────────
  const [redeemedCodes,  setRedeemedCodes]  = useState<Set<string>>(new Set());
  const [redeemSaving,   setRedeemSaving]   = useState<string | null>(null);

  // ── Item 6: Countdown to midnight ──────────────────────────────────────────
  const [countdown,      setCountdown]      = useState(() => formatCountdown(secondsUntilMidnight()));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(formatCountdown(secondsUntilMidnight()));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Load missions + completed state + XP + redeemed codes ─────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: missionData } = await supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (missionData) setMissions(missionData);

      const today = new Date().toISOString().split("T")[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userMissions } = await (supabase as any)
        .from("user_missions")
        .select("mission_id")
        .eq("user_id", user.id)
        .gte("completed_at", today);
      if (userMissions) {
        setCompletedIds(new Set((userMissions as { mission_id: string }[]).map((m) => m.mission_id)));
      }

      // Total accumulated XP
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allCompleted } = await (supabase as any)
        .from("user_missions")
        .select("mission_id, missions(xp_reward)")
        .eq("user_id", user.id);
      if (allCompleted) {
        const total = (allCompleted as { missions: { xp_reward: number } | null }[]).reduce(
          (sum, um) => sum + (um.missions?.xp_reward ?? 0), 0,
        );
        setBaseXp(total);
      }

      // ── Item 5: load redeemed codes ──
      const { data: redemptions } = await supabase
        .from("reward_redemptions")
        .select("reward_code")
        .eq("user_id", user.id);
      if (redemptions) {
        setRedeemedCodes(new Set(redemptions.map((r) => r.reward_code)));
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // ── Toggle mission complete / incomplete ───────────────────────────────────
  async function toggleMission(mission: Mission) {
    if (!userId || savingId) return;
    setSavingId(mission.id);

    let newXp = baseXp;

    if (completedIds.has(mission.id)) {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("user_missions")
        .delete()
        .eq("user_id", userId)
        .eq("mission_id", mission.id)
        .gte("completed_at", today);
      setCompletedIds((prev) => { const next = new Set(prev); next.delete(mission.id); return next; });
      newXp = baseXp - (mission.xp_reward ?? 0);
      setBaseXp(newXp);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("user_missions").insert({
        user_id:      userId,
        mission_id:   mission.id,
        completed_at: new Date().toISOString(),
      });
      setCompletedIds((prev) => new Set([...prev, mission.id]));
      newXp = baseXp + (mission.xp_reward ?? 0);
      setBaseXp(newXp);
      showToast(`+${mission.xp_reward ?? 0} XP Earned`);
    }

    // Sync XP and guardian level to profiles table
    const newLevel = Math.max(1, Math.floor(newXp / XP_PER_LEVEL) + 1);
    await supabase.from("profiles").upsert(
      { id: userId, xp: newXp, guardian_level: newLevel },
      { onConflict: "id" },
    );

    setSavingId(null);
  }

  // ── Item 5: Copy voucher code + record redemption in DB ────────────────────
  async function copyCode(code: string) {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard blocked — proceed anyway
    }
    setCopySuccess(code);
    setTimeout(() => setCopySuccess(null), 2000);

    // Already redeemed → no duplicate insert
    if (redeemedCodes.has(code)) {
      showToast(`Code: ${code}`);
      return;
    }

    setRedeemSaving(code);
    const { error } = await supabase.from("reward_redemptions").insert({
      user_id:     userId,
      reward_code: code,
      redeemed_at: new Date().toISOString(),
    });
    if (!error) {
      setRedeemedCodes((prev) => new Set([...prev, code]));
      showToast(`Redeemed: ${code}`);
    } else {
      // Duplicate (unique constraint) — mark redeemed silently
      if (error.code === "23505") {
        setRedeemedCodes((prev) => new Set([...prev, code]));
      }
      showToast(`Code: ${code}`);
    }
    setRedeemSaving(null);
  }

  // ── Redeem all unlocked vouchers ──────────────────────────────────────────
  function handleRedeemAll() {
    const unlocked = REWARDS.filter((r) => xpTotal >= r.xpRequired);
    if (unlocked.length === 0) return;
    setShowRedeem(true);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const xpTotal       = baseXp;
  const progress      = Math.min((xpTotal / XP_PER_LEVEL) * 100, 100);
  const guardianLevel = Math.max(1, Math.floor(xpTotal / XP_PER_LEVEL) + 1);
  const unlockedCount = REWARDS.filter((r) => xpTotal >= r.xpRequired).length;

  return (
    <div className="min-h-screen bg-[#f9f9f9]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full font-sans text-xs font-semibold tracking-widest uppercase shadow-lg transition-all">
          {toast}
        </div>
      )}

      {/* ── Redeem modal ──────────────────────────────────────────────────── */}
      {showRedeem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowRedeem(false)}
        >
          <div
            className="bg-white rounded-[40px] p-12 max-w-md w-full mx-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  redeem
                </span>
              </div>
              <div>
                <h3 className="font-serif font-medium text-2xl">Your Vouchers</h3>
                <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">
                  {unlockedCount} unlocked
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {REWARDS.map((r) => {
                const unlocked  = xpTotal >= r.xpRequired;
                const redeemed  = redeemedCodes.has(r.code);
                const isSaving  = redeemSaving === r.code;
                return (
                  <div
                    key={r.code}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      unlocked ? "border-black bg-[#f9f9f9]" : "border-[#e2e2e2] opacity-40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-black">{r.icon}</span>
                      <div>
                        <p className="font-sans text-sm font-semibold">{r.title}</p>
                        <p className="font-mono text-xs text-[#5e5e5e]">
                          {unlocked ? r.code : `Requires ${r.xpRequired} XP`}
                        </p>
                      </div>
                    </div>
                    {unlocked && (
                      <button
                        onClick={() => copyCode(r.code)}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-sans text-[10px] font-semibold tracking-widest uppercase transition-all disabled:opacity-50 ${
                          redeemed
                            ? "bg-[#50a14f] border-[#50a14f] text-white"
                            : copySuccess === r.code
                              ? "bg-[#50a14f] border-[#50a14f] text-white"
                              : "border-black hover:bg-black hover:text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                          {redeemed || copySuccess === r.code ? "check" : "content_copy"}
                        </span>
                        {redeemed ? "Redeemed" : copySuccess === r.code ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="font-sans text-[10px] text-[#5e5e5e] uppercase tracking-widest text-center mb-6">
              Present your voucher code at your nearest PANACEA health partner.
            </p>
            <button
              onClick={() => setShowRedeem(false)}
              className="w-full py-3 rounded-full bg-black text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.05), transparent)", filter: "blur(40px)", animation: "move 20s infinite alternate linear" }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.05), transparent)", filter: "blur(40px)", animation: "move 20s infinite alternate linear", animationDelay: "-5s" }}
        />
      </div>

      <main className="max-w-[1200px] mx-auto px-16 py-12 pt-32 relative z-10">

        {/* Header */}
        <header className="mb-32">
          <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-4">
            Community Prevention Program
          </p>
          <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight text-black mb-8 max-w-2xl">
            Refining the Shield of Our Community.
          </h1>

          {/* Guardian Progress */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-end">
            <div className="md:col-span-2">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-tighter text-[#5e5e5e] block">
                    Current Status
                  </span>
                  <h2 className="font-serif font-medium text-2xl">Guardian Level {guardianLevel}</h2>
                </div>
                <span className="font-mono text-2xl font-semibold">
                  {xpTotal}<span className="text-[#5e5e5e]">/{XP_PER_LEVEL}</span>
                </span>
              </div>
              <div className="h-1 bg-[#e2e2e2] w-full rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="md:col-span-3 border-l border-[#cfc4c5] pl-8 hidden md:block">
              <p className="text-[#5e5e5e] max-w-md font-sans text-base leading-relaxed">
                Your consistent actions directly reduce local infection rates. Each completed
                mission contributes to the community resilience fund.
              </p>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Left: Daily Missions */}
          <section className="lg:col-span-7 space-y-12">
            <div className="flex justify-between items-baseline border-b border-[#cfc4c5] pb-4">
              <h3 className="font-serif italic font-light text-2xl">Daily Missions</h3>
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">
                {completedIds.size}/{String(missions.length).padStart(2, "0")} Completed
              </span>
            </div>

            {missions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#cfc4c5] rounded-2xl">
                <div className="animate-pulse font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">
                  Loading missions...
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {missions.map((m) => {
                  const done = completedIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`border-t border-[#cfc4c5] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative transition-opacity ${done ? "opacity-60" : ""}`}
                    >
                      <div className="absolute top-0 left-0 h-0.5 bg-black transition-all duration-500 w-1/3 hover:w-full" />
                      <div className="flex gap-6 items-start">
                        <span className="material-symbols-outlined text-3xl pt-1 text-black">
                          {m.icon ?? "task_alt"}
                        </span>
                        <div>
                          <h4 className="font-serif font-medium text-2xl mb-1">{m.title}</h4>
                          <p className="text-[#5e5e5e] text-sm leading-relaxed">{m.description}</p>
                          <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-[#f3f3f4] font-mono text-[10px] rounded-full">
                              +{m.xp_reward} XP
                            </span>
                            {m.tag && (
                              <span className="px-2 py-1 bg-[#f3f3f4] font-mono text-[10px] rounded-full">
                                {m.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleMission(m)}
                        disabled={savingId === m.id}
                        className={`rounded-full px-8 py-3 font-sans text-xs font-semibold tracking-widest uppercase transition-all whitespace-nowrap disabled:opacity-50 ${
                          done
                            ? "bg-[#50a14f] text-white cursor-pointer hover:bg-[#ba1a1a]"
                            : "bg-black text-white hover:bg-[#1b1b1b] active:scale-95"
                        }`}
                      >
                        {savingId === m.id ? "..." : done ? "✓ Done" : "Complete"}
                      </button>
                    </div>
                  );
                })}

                {/* ── Item 6: Live countdown to midnight instead of placeholder ── */}
                <div className="border-t border-[#cfc4c5] p-8 flex items-center gap-4 text-[#5e5e5e]">
                  <span className="material-symbols-outlined">schedule</span>
                  <div>
                    <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">
                      New Missions Unlock In
                    </p>
                    <p className="font-mono text-sm text-black mt-0.5">{countdown}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right: Rewards Wallet */}
          <aside className="lg:col-span-5">
            <div className="sticky top-32 space-y-8">

              {/* Dark rewards card */}
              <div className="p-10 bg-[#1b1b1b] text-white rounded-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <h3 className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#848484] mb-8">
                  Rewards Wallet
                </h3>

                <div className="space-y-8">
                  {REWARDS.map((r, i) => {
                    const unlocked  = xpTotal >= r.xpRequired;
                    const redeemed  = redeemedCodes.has(r.code);
                    return (
                      <div key={r.title}>
                        <div
                          className={`flex justify-between items-center group ${
                            unlocked ? "cursor-pointer" : "cursor-default"
                          } ${!unlocked ? "opacity-40" : ""}`}
                          onClick={() => {
                            if (unlocked) {
                              copyCode(r.code);
                            } else {
                              showToast(`Requires ${r.xpRequired} XP to unlock`);
                            }
                          }}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-white">{r.icon}</span>
                            </div>
                            <div>
                              <p className="font-serif font-medium text-[18px]">{r.title}</p>
                              <p className="text-[#848484] text-xs">
                                {unlocked
                                  ? redeemed
                                    ? "✓ Redeemed"
                                    : copySuccess === r.code
                                      ? "✓ Copied to clipboard"
                                      : r.sub
                                  : `Requires ${r.xpRequired} XP`}
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {unlocked ? (redeemed ? "check_circle" : "content_copy") : "lock"}
                          </span>
                        </div>
                        {i < REWARDS.length - 1 && (
                          <div className="h-px bg-white/10 mt-8" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleRedeemAll}
                  disabled={unlockedCount === 0}
                  className="w-full mt-12 py-4 bg-white text-black rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#f3f3f4] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {unlockedCount === 0
                    ? "Earn 100 XP to Unlock"
                    : `View ${unlockedCount} Voucher${unlockedCount > 1 ? "s" : ""}`}
                </button>
              </div>

              {/* Editorial image card */}
              <div className="relative rounded-[40px] overflow-hidden aspect-[4/3] group">
                <img
                  src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80"
                  alt="Laboratory precision"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ filter: "grayscale(1)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-10 flex flex-col justify-end">
                  <p className="text-white/60 font-mono text-[10px] mb-2">Research Insight</p>
                  <h4 className="text-white font-serif italic text-xl">
                    The Impact of Distributed Vigilance.
                  </h4>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-32 bg-white border-t border-[#cfc4c5] mt-32 relative z-10">
        <div className="max-w-[1200px] mx-auto px-16 flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="font-sans font-semibold text-lg tracking-widest uppercase text-black">PANACEA</span>
          <p className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e]">
            © 2026 PANACEA INFECTIOUS DISEASE INSTITUTE.
          </p>
          <div className="flex gap-8">
            {[
              { label: "Privacy Policy", href: "/legal#privacy-commitment" },
              { label: "Terms of Use",   href: "/legal#terms-acceptance"   },
              { label: "Contact",        href: "/legal#privacy-contact"    },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes move {
          from { transform: translate(-10%, -10%) scale(1); }
          to   { transform: translate(10%, 10%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
