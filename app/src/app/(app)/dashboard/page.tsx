"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Mission } from "@/lib/supabase/types";

const INSIGHTS = [
  { num: "01", label: "BODY ATLAS", title: "Visualize Pathology", href: "/body-atlas" },
  { num: "02", label: "COMMUNITY HEATMAP", title: "Real-time Outbreak Data", href: "/heatmap" },
  { num: "03", label: "AI GUIDANCE", title: "Symptom Analysis", href: "/ai-guidance" },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 미션 목록
      const { data: missionData } = await supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (missionData) setMissions(missionData);

      // 오늘 완료된 미션
      const today = new Date().toISOString().split("T")[0];
      const { data: userMissions } = await supabase
        .from("user_missions")
        .select("mission_id")
        .eq("user_id", user.id)
        .gte("completed_at", today);
      if (userMissions) {
        setCompletedIds(new Set((userMissions as { mission_id: string | null }[]).map((m) => m.mission_id ?? "")));
      }
    }
    load();
  }, []);

  async function toggleMission(missionId: string) {
    if (!userId || savingId) return;
    setSavingId(missionId);

    if (completedIds.has(missionId)) {
      // 완료 취소 — 오늘 날짜 기록 삭제
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("user_missions")
        .delete()
        .eq("user_id", userId)
        .eq("mission_id", missionId)
        .gte("completed_at", today);
      setCompletedIds((prev) => { const next = new Set(prev); next.delete(missionId); return next; });
    } else {
      // 완료 기록
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("user_missions") as any).insert({
        user_id: userId,
        mission_id: missionId,
        completed_at: new Date().toISOString(),
      });
      setCompletedIds((prev) => new Set([...prev, missionId]));
    }
    setSavingId(null);
  }

  const completedCount = completedIds.size;
  const total = missions.length || 3;
  const progress = Math.round((completedCount / total) * 100);

  return (
    <div className="min-h-screen bg-[#f9f9f9] overflow-x-hidden">
      {/* Ambient orb */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{ background: "linear-gradient(135deg, #ba1a1a 0%, #ffdad6 100%)", filter: "blur(60px)", opacity: 0.08 }} />

      <main className="pt-32 pb-32 px-16 max-w-[1200px] mx-auto">

        {/* Hero Risk Section */}
        <section className="flex flex-col items-center justify-center text-center mb-24">
          <span className="font-sans text-xs font-semibold tracking-[0.3em] uppercase text-[#5e5e5e] mb-8">Environmental Protocol</span>

          {/* Risk Orb */}
          <div className="relative w-80 h-80 flex items-center justify-center mb-12">
            <div className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(186,26,26,0.15) 0%, transparent 70%)", animation: "pulse-glow 4s ease-in-out infinite" }} />
            <div className="absolute w-[280px] h-[280px] rounded-full border border-[#ba1a1a]/20"
              style={{ animation: "rotate-ring 12s linear infinite" }} />
            <div className="absolute -right-4 top-1/4 z-20 bg-white border border-[#cfc4c5] p-3 rounded-xl shadow-sm">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] block mb-1">priority_high</span>
              <span className="font-sans text-[10px] text-[#5e5e5e] font-semibold">INCIDENCE: +12%</span>
            </div>
            <div className="relative w-60 h-60 rounded-full bg-white border border-[#cfc4c5] flex flex-col items-center justify-center shadow-sm z-10">
              <span className="font-sans text-[10px] font-semibold tracking-widest text-[#ba1a1a]/70 mb-1">CURRENT STATUS</span>
              <span className="font-serif font-semibold text-[48px] leading-none text-[#ba1a1a]">HIGH</span>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-pulse" />
                <span className="font-sans text-[10px] text-[#5e5e5e]">LIVE FEED</span>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-[42px] font-light leading-tight max-w-lg mb-6">
            Increased viral activity detected in your immediate vicinity.
          </h1>
          <p className="font-sans text-base text-[#5e5e5e] max-w-md mb-12">
            Localized reporting indicates a significant elevation in transmission risk. Exercise caution in enclosed public spaces.
          </p>

          {/* Voice guidance → AI Guidance */}
          <Link href="/ai-guidance" className="w-full max-w-md">
            <div className="bg-white rounded-2xl border border-[#cfc4c5] p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:border-black transition-all cursor-pointer group mb-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#e8e8e8] rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">mic</span>
                </div>
                <div className="text-left">
                  <span className="block font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">AI Guidance</span>
                  <span className="block font-serif font-medium text-[18px] text-black">Describe your symptoms →</span>
                </div>
              </div>
              <div className="flex items-center gap-[3px] opacity-40 group-hover:opacity-100 transition-opacity">
                {[0, 0.1, 0.2, 0.3].map((delay, i) => (
                  <div key={i} className="w-[3px] rounded-sm bg-black"
                    style={{ height: "8px", animation: `wave 1s ease-in-out infinite`, animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          </Link>
        </section>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 w-full border-y border-[#cfc4c5] mb-24">
          {[
            { icon: "thermostat", label: "TEMP", val: "24.5°C" },
            { icon: "humidity_mid", label: "HUMIDITY", val: "68%" },
            { icon: "groups", label: "DENSITY", val: "CRITICAL" },
            { icon: "air", label: "AQI", val: "MODERATE" },
          ].map((m, i) => (
            <div key={m.label} className={`flex flex-col items-center p-6 ${i < 3 ? "border-r border-[#cfc4c5]" : ""}`}>
              <span className="material-symbols-outlined text-black mb-3">{m.icon}</span>
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-1">{m.label}</span>
              <span className="font-serif font-medium text-2xl">{m.val}</span>
            </div>
          ))}
        </div>

        {/* Daily Prevention Missions */}
        <section className="mb-32">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-2">Protocol Adherence</span>
              <h2 className="font-serif text-[42px] font-light leading-[1.3]">Daily Prevention Missions</h2>
            </div>
            {/* Progress ring → Guardian */}
            <Link href="/guardian" className="flex items-center gap-4 bg-[#eeeeee] p-4 rounded-xl border border-[#cfc4c5] hover:border-black transition-all group">
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#cfc4c5" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#000" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${175.9 * progress / 100} 175.9`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-sans text-xs font-semibold text-black">{progress}%</div>
              </div>
              <div>
                <span className="block font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">Guardian Progress</span>
                <span className="block font-serif font-medium text-base group-hover:underline">View All Missions →</span>
              </div>
            </Link>
          </div>

          {missions.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-[#cfc4c5] rounded-2xl">
              <div className="animate-pulse font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">Loading missions...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {missions.map((m) => {
                const done = completedIds.has(m.id);
                return (
                  <div key={m.id}
                    className={`bg-white border p-8 rounded-2xl flex flex-col items-start hover:border-black transition-all group ${done ? "border-black bg-[#f9f9f9]" : "border-[#cfc4c5]"}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#eeeeee] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-black">{m.icon ?? "task_alt"}</span>
                    </div>
                    <h3 className="font-serif font-medium text-2xl mb-2">{m.title}</h3>
                    <p className="font-sans text-base text-[#5e5e5e] mb-2 flex-grow leading-relaxed">{m.description}</p>
                    <span className="font-mono text-[10px] text-[#5e5e5e] mb-6">+{m.xp_reward} XP</span>
                    <button
                      onClick={() => toggleMission(m.id)}
                      disabled={savingId === m.id}
                      className={`w-full py-3 rounded-xl border font-sans text-xs font-semibold tracking-widest uppercase transition-colors disabled:opacity-50 ${
                        done ? "bg-black text-white border-black" : "border-black text-black hover:bg-black hover:text-white"
                      }`}>
                      {savingId === m.id ? "Saving..." : done ? "✓ Completed" : "Complete Mission"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Contextual Insight Section */}
        <section className="border-t border-[#cfc4c5] pt-32 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-2/5 aspect-[4/5] rounded-3xl overflow-hidden bg-[#e8e8e8] relative">
            <img src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80"
              alt="Infection Risk Visual"
              className="w-full h-full object-cover opacity-80"
              style={{ filter: "grayscale(1)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
          </div>
          <div className="w-full md:w-3/5 flex flex-col justify-center gap-8 pl-0 md:pl-8">
            <div>
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">The Intelligence Layer</span>
              <h2 className="font-serif text-[42px] font-light leading-[1.3]">Spatial Intelligence for Proactive Health</h2>
            </div>
            <div className="space-y-0">
              {INSIGHTS.map((item) => (
                <Link key={item.num} href={item.href}
                  className="group border-t border-[#cfc4c5] py-6 flex justify-between items-center hover:border-black transition-colors block">
                  <div className="flex items-center gap-6">
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] text-[#5e5e5e]">{item.num}</span>
                    <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-black">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[#5e5e5e] group-hover:text-black transition-colors">north_east</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes pulse-glow { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.15);opacity:.8} }
        @keyframes rotate-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes wave { 0%,100%{height:8px} 50%{height:16px} }
      `}</style>
    </div>
  );
}
