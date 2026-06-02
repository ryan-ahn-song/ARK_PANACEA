"use client";

import { useState, useEffect } from "react";

const MISSIONS = [
  {
    id: "1",
    tag: "APPLY REPELLENT",
    status: "Active" as const,
    title: "Chemical barrier protection protocol",
    xp: 15,
    icon: "pest_control",
  },
  {
    id: "2",
    tag: "CLEAR STANDING WATER",
    status: "Pending" as const,
    title: "Larvae habitat destruction mission",
    xp: 25,
    icon: "water_drop",
  },
  {
    id: "3",
    tag: "RESPIRATORY SHIELD",
    status: "Pending" as const,
    title: "Aerosol transmission mitigation",
    xp: 10,
    icon: "masks",
  },
];

const REWARDS = [
  {
    id: "r1",
    icon: "grid_4x4",
    title: "MOSQUITO NET",
    sub: "Physical barrier protection",
    xp: 150,
  },
  {
    id: "r2",
    icon: "clean_hands",
    title: "HYGIENE KIT",
    sub: "Antimicrobial pack",
    xp: 50,
  },
  {
    id: "r3",
    icon: "medical_services",
    title: "MEDICINE VOUCHER",
    sub: "Clinic hub fulfillment",
    xp: 200,
  },
];

const STATUS_COLOR: Record<string, string> = {
  Active: "#50a14f",
  Pending: "#986801",
};

export default function GuardianPage() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [xp, setXp] = useState(270);
  const [timeLeft, setTimeLeft] = useState({ h: 1, m: 14, s: 22 });

  // countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function toggleMission(id: string, mxp: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setXp((x) => x - mxp); }
      else { next.add(id); setXp((x) => x + mxp); }
      return next;
    });
  }

  const level = Math.max(1, Math.floor(xp / 500) + (xp >= 500 ? 1 : 3));
  const xpMax = 500;
  const progress = Math.min((xp / xpMax) * 100, 100);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <main className="max-w-[900px] mx-auto px-6 pt-24 pb-24">

        {/* ── Header ── */}
        <div className="mb-8">
          <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2">
            Preventative Action Protocol
          </p>
          <h1 className="font-serif font-semibold text-[38px] leading-tight text-black mb-2">
            Guardian Challenge
          </h1>
          <p className="font-sans text-sm text-[#5e5e5e] max-w-lg leading-relaxed">
            Gamified community health security. Execute daily prevention missions to secure essential supplies and clinical vouchers through our partner network.
          </p>
        </div>

        {/* ── Profile Card ── */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 mb-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
              </div>
              <div>
                <div className="font-serif font-semibold text-[18px] leading-tight">Level {level} Guardian</div>
                <div className="font-sans text-xs text-[#5e5e5e]">Registry ID: PX-772-09</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">XP Progress</span>
                <span className="font-sans text-[10px] font-semibold text-[#5e5e5e]">{xp} / {xpMax} PTS</span>
              </div>
              <div className="h-2 bg-[#e8e8e8] rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="flex gap-px rounded-xl overflow-hidden border border-[#e8e8e8] flex-shrink-0">
            <div className="px-8 py-5 bg-[#fafafa] text-center">
              <div className="font-serif font-semibold text-[28px] leading-none mb-1">12</div>
              <div className="font-sans text-[9px] font-semibold tracking-[0.15em] uppercase text-[#5e5e5e]">Day Streak</div>
            </div>
            <div className="px-8 py-5 bg-[#fafafa] text-center border-l border-[#e8e8e8]">
              <div className="font-serif font-semibold text-[28px] leading-none mb-1">89%</div>
              <div className="font-sans text-[9px] font-semibold tracking-[0.15em] uppercase text-[#5e5e5e]">Adherence</div>
            </div>
          </div>
        </div>

        {/* ── Two columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Daily Missions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-[20px]">Daily Missions</span>
                <span className="px-2 py-0.5 bg-black text-white font-sans text-[9px] font-semibold tracking-wide rounded-full">
                  {MISSIONS.length} ACTIVE
                </span>
              </div>
              <span className="font-sans text-[10px] text-[#5e5e5e]">
                Refreshes {pad(timeLeft.h)}h {pad(timeLeft.m)}m {pad(timeLeft.s)}s
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {MISSIONS.map((m) => {
                const done = completed.has(m.id);
                return (
                  <div key={m.id}
                    className={`bg-white rounded-xl border border-[#e8e8e8] p-4 transition-opacity ${done ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "17px" }}>{m.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-sans text-[10px] font-semibold tracking-wide text-black uppercase">{m.tag}</span>
                          <span className="font-sans text-[10px] font-semibold" style={{ color: STATUS_COLOR[m.status] }}>
                            {m.status}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-[#5e5e5e] leading-snug mb-2">{m.title}</p>
                        <span className="font-sans text-[10px] font-semibold text-[#4a7abb]">+{m.xp} XP</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => toggleMission(m.id, m.xp)}
                        className={`px-5 py-1.5 rounded-full font-sans text-[10px] font-semibold tracking-wide uppercase border transition-all ${
                          done
                            ? "bg-[#50a14f] text-white border-[#50a14f]"
                            : "border-[#ccc] text-black hover:bg-black hover:text-white hover:border-black"
                        }`}>
                        {done ? "✓ Done" : "Complete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Rewards Wallet */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif font-semibold text-[20px]">Rewards Wallet</span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white">
                <span className="material-symbols-outlined" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-sans text-[10px] font-semibold tracking-wide">{xp} XP</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {REWARDS.map((r) => {
                const unlocked = xp >= r.xp;
                return (
                  <div key={r.id}
                    className={`bg-white rounded-xl border border-[#e8e8e8] p-4 transition-opacity ${!unlocked ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "17px" }}>{r.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-black">{r.title}</div>
                        <div className="font-sans text-[10px] text-[#5e5e5e]">{r.sub}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs font-semibold text-[#5e5e5e]">{r.xp} XP</span>
                      <button
                        disabled={!unlocked}
                        className={`px-4 py-1.5 rounded-full font-sans text-[10px] font-semibold tracking-wide uppercase transition-all ${
                          unlocked
                            ? "bg-black text-white hover:bg-[#333]"
                            : "bg-[#e8e8e8] text-[#aaa] cursor-not-allowed"
                        }`}>
                        Redeem Voucher
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Partner Network card */}
              <div className="bg-[#f0f0f0] rounded-xl border border-[#e8e8e8] p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "16px" }}>hub</span>
                  <span className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-[#5e5e5e]">Partner Network</span>
                </div>
                <p className="font-sans text-xs text-[#7e7e7e] leading-relaxed pr-10">
                  Fulfillment managed by certified NGOs and community health clinics.
                </p>
                <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#e0e0e0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aaa]" style={{ fontSize: "16px" }}>add</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#e8e8e8] bg-white">
        <div className="max-w-[900px] mx-auto px-6 py-12 flex flex-col md:flex-row justify-between gap-10">
          <div>
            <div className="font-serif italic font-semibold text-xl mb-2">PANACEA</div>
            <div className="font-serif text-[22px] font-light text-[#333]">Empowering health sovereignty.</div>
          </div>
          <div className="flex gap-12 text-xs">
            <div>
              <div className="font-sans font-semibold tracking-[0.15em] uppercase text-[#5e5e5e] mb-3">Ecosystem</div>
              <div className="flex flex-col gap-2">
                <a href="#" className="font-sans text-[#333] hover:text-black transition-colors">Prevention</a>
                <a href="#" className="font-sans text-[#333] hover:text-black transition-colors">Rewards</a>
              </div>
            </div>
            <div>
              <div className="font-sans font-semibold tracking-[0.15em] uppercase text-[#5e5e5e] mb-3">Legal</div>
              <div className="flex flex-col gap-2">
                <a href="#" className="font-sans text-[#333] hover:text-black transition-colors">Privacy</a>
                <a href="#" className="font-sans text-[#333] hover:text-black transition-colors">Terms</a>
              </div>
            </div>
            <div>
              <div className="font-sans font-semibold tracking-[0.15em] uppercase text-[#5e5e5e] mb-3">Connect</div>
              <div className="flex flex-col gap-2">
                <a href="#" className="font-sans text-[#333] hover:text-black transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-[#e8e8e8]">
          <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
            <span className="font-sans text-[10px] text-[#5e5e5e]">© 2024 PANACEA Digital Health</span>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "16px" }}>language</span>
              <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
