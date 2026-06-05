"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mission } from "@/lib/supabase/types";

const REWARDS = [
  { icon: "grid_view", title: "Mosquito Net", sub: "Voucher: #PAN-MN-442", xpRequired: 100 },
  { icon: "clean_hands", title: "Antiseptic Soap", sub: "3 Units Available", xpRequired: 200 },
  { icon: "medication", title: "Essential Medicine", sub: "Claim at Local Clinic", xpRequired: 400 },
];

export default function GuardianPage() {
  const supabase = createClient();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [baseXp, setBaseXp] = useState(0);
  const [toast, setToast] = useState("");

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

      // 전체 누적 XP
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allCompleted } = await (supabase as any)
        .from("user_missions")
        .select("mission_id, missions(xp_reward)")
        .eq("user_id", user.id);

      if (allCompleted) {
        const total = (allCompleted as { missions: { xp_reward: number } | null }[]).reduce((sum, um) => {
          return sum + (um.missions?.xp_reward ?? 0);
        }, 0);
        setBaseXp(total);
      }
    }
    load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function toggleMission(mission: Mission) {
    if (!userId || savingId) return;
    setSavingId(mission.id);

    if (completedIds.has(mission.id)) {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("user_missions")
        .delete()
        .eq("user_id", userId)
        .eq("mission_id", mission.id)
        .gte("completed_at", today);
      setCompletedIds((prev) => { const next = new Set(prev); next.delete(mission.id); return next; });
      setBaseXp((x) => x - (mission.xp_reward ?? 0));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("user_missions").insert({
        user_id: userId,
        mission_id: mission.id,
        completed_at: new Date().toISOString(),
      });
      setCompletedIds((prev) => new Set([...prev, mission.id]));
      setBaseXp((x) => x + (mission.xp_reward ?? 0));
    }
    setSavingId(null);
  }

  const xpTotal = baseXp;
  const xpForNextLevel = 500;
  const progress = Math.min((xpTotal / xpForNextLevel) * 100, 100);
  const guardianLevel = Math.max(1, Math.floor(xpTotal / xpForNextLevel) + 1);

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full font-sans text-xs font-semibold tracking-widest uppercase shadow-lg">
          {toast}
        </div>
      )}

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.05), transparent)", filter: "blur(40px)", animation: "move 20s infinite alternate linear" }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.05), transparent)", filter: "blur(40px)", animation: "move 20s infinite alternate linear", animationDelay: "-5s" }} />
      </div>

      <main className="max-w-[1200px] mx-auto px-16 py-12 pt-32 relative z-10">

        {/* Header */}
        <header className="mb-32">
          <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-4">Community Prevention Program</p>
          <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight text-black mb-8 max-w-2xl">
            Refining the Shield of Our Community.
          </h1>

          {/* Guardian Progress */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-end">
            <div className="md:col-span-2">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-tighter text-[#5e5e5e] block">Current Status</span>
                  <h2 className="font-serif font-medium text-2xl">Guardian Level {guardianLevel}</h2>
                </div>
                <span className="font-mono text-2xl font-semibold">
                  {xpTotal}<span className="text-[#5e5e5e]">/{xpForNextLevel}</span>
                </span>
              </div>
              <div className="h-1 bg-[#e2e2e2] w-full rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="md:col-span-3 border-l border-[#cfc4c5] pl-8 hidden md:block">
              <p className="text-[#5e5e5e] max-w-md font-sans text-base leading-relaxed">
                Your consistent actions directly reduce local infection rates. Each completed mission contributes to the community resilience fund.
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
                {completedIds.size}/0{missions.length} Completed
              </span>
            </div>

            {missions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#cfc4c5] rounded-2xl">
                <div className="animate-pulse font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">Loading missions...</div>
              </div>
            ) : (
              <div className="space-y-0">
                {missions.map((m) => {
                  const done = completedIds.has(m.id);
                  return (
                    <div key={m.id}
                      className={`border-t border-[#cfc4c5] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative transition-opacity ${done ? "opacity-60" : ""}`}>
                      <div className="absolute top-0 left-0 h-0.5 bg-black transition-all duration-500 w-1/3 hover:w-full" />
                      <div className="flex gap-6 items-start">
                        <span className="material-symbols-outlined text-3xl pt-1 text-black">{m.icon ?? "task_alt"}</span>
                        <div>
                          <h4 className="font-serif font-medium text-2xl mb-1">{m.title}</h4>
                          <p className="text-[#5e5e5e] text-sm leading-relaxed">{m.description}</p>
                          <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-[#f3f3f4] font-mono text-[10px] rounded-full">+{m.xp_reward} XP</span>
                            {m.tag && <span className="px-2 py-1 bg-[#f3f3f4] font-mono text-[10px] rounded-full">{m.tag}</span>}
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

                {/* Locked placeholder */}
                <div className="border-t border-[#cfc4c5] p-8 flex items-center gap-4 text-[#5e5e5e]">
                  <span className="material-symbols-outlined">lock</span>
                  <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">
                    New Missions Unlock Tomorrow
                  </p>
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
                    const unlocked = xpTotal >= r.xpRequired;
                    return (
                      <div key={r.title}>
                        <div className={`flex justify-between items-center group cursor-pointer ${!unlocked ? "opacity-40" : ""}`}
                          onClick={() => unlocked && showToast(`Voucher copied: ${r.sub}`)}>
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-white">{r.icon}</span>
                            </div>
                            <div>
                              <p className="font-serif font-medium text-[18px]">{r.title}</p>
                              <p className="text-[#848484] text-xs">{unlocked ? r.sub : `Requires ${r.xpRequired} XP`}</p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {unlocked ? "arrow_forward" : "lock"}
                          </span>
                        </div>
                        {i < REWARDS.length - 1 && <div className="h-px bg-white/10 mt-8" />}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => showToast("Vouchers redeemed! Check your email.")}
                  disabled={xpTotal < 100}
                  className="w-full mt-12 py-4 bg-white text-black rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#f3f3f4] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                  Redeem All Vouchers
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
                  <h4 className="text-white font-serif italic text-xl">The Impact of Distributed Vigilance.</h4>
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
            © 2025 PANACEA INFECTIOUS DISEASE INSTITUTE.
          </p>
          <div className="flex gap-8">
            {["Privacy Policy", "Terms of Service", "Contact"].map((l) => (
              <a key={l} href="#" className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes move { from{transform:translate(-10%,-10%) scale(1)} to{transform:translate(10%,10%) scale(1.1)} }
      `}</style>
    </div>
  );
}
