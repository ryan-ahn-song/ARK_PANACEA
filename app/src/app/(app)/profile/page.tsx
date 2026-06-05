"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, HealthLog } from "@/lib/supabase/types";

const GUARDIAN_ITEMS = [
  { icon: "bedtime", code: "GS-001", title: "Mosquito Nets", desc: "4 Units distributed in region Alpha.", progress: 75 },
  { icon: "clean_hands", code: "GS-042", title: "Sanitation Kits", desc: "Earned for 30-day streak reporting.", progress: 100 },
];

const ACTIVITY_HEIGHTS = [40, 65, 85, 30, 55, 90, 45];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      const { data: healthLogs } = await supabase
        .from("health_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: false })
        .limit(10);
      if (healthLogs) setLogs(healthLogs);
    }
    load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const displayName = profile?.full_name || email.split("@")[0] || "User";
  const tier = profile?.tier ?? "Community";
  const level = profile?.guardian_level ?? 1;
  const percentile = profile?.percentile ?? 50;
  const xp = profile?.xp ?? 0;

  const visibleLogs = showAllLogs ? logs : logs.slice(0, 3);

  const REFINEMENT_ITEMS = [
    { icon: "lock", label: "Privacy", action: () => showToast("Privacy settings coming soon") },
    { icon: "notifications", label: "Alerts", action: () => showToast("Alert preferences coming soon") },
    { icon: "download", label: "Export", action: () => showToast("Data export coming soon") },
    { icon: "logout", label: "Logout", action: handleLogout },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full font-sans text-xs font-semibold tracking-widest uppercase shadow-lg transition-all">
          {toast}
        </div>
      )}

      <main className="pt-20 px-16 max-w-[1200px] mx-auto pb-32">

        {/* Profile Header */}
        <header className="py-16 md:py-24 flex flex-col md:flex-row gap-12 items-center md:items-start border-b border-[#cfc4c5] mb-20">
          <div className="relative group">
            <div className="w-48 h-48 rounded-full overflow-hidden border border-[#cfc4c5]"
              style={{ filter: "grayscale(1)", transition: "filter 0.7s" }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "grayscale(0)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "grayscale(1)")}>
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-black text-white p-3 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">Guardian Level {level}</span>
              <div className="w-3 h-3 rounded-full bg-black" style={{ animation: "pulse 3s ease-in-out infinite" }} />
            </div>
            <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight mb-2">{displayName}</h1>
            <p className="font-sans text-sm text-[#5e5e5e] mb-4">{email}</p>
            <p className="font-sans text-[28px] font-light leading-[1.2] tracking-[-0.01em] text-[#5e5e5e] max-w-2xl">
              Refining personal wellness through data-driven insight and environmental stewardship.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8">
              {[
                { icon: "eco", label: `${tier} Tier ${level}` },
                { icon: "monitoring", label: `${percentile}th Percentile` },
                { icon: "star", label: `${xp} XP` },
              ].map((badge) => (
                <div key={badge.label} className="px-6 py-3 rounded-xl flex items-center gap-3 border border-[#cfc4c5]"
                  style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
                  <span className="material-symbols-outlined text-black">{badge.icon}</span>
                  <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Left — Guardian + Activity */}
          <div className="md:col-span-7 space-y-12">
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">Guardian Status</h2>
                <Link href="/guardian" className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-black underline hover:text-[#5e5e5e] transition-colors">
                  View All Missions →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {GUARDIAN_ITEMS.map((item) => (
                  <div key={item.code} className="p-8 rounded-xl border border-[#cfc4c5] hover:bg-[#f3f3f4] transition-colors"
                    style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
                    <div className="flex justify-between items-start mb-6">
                      <span className="material-symbols-outlined text-4xl text-black">{item.icon}</span>
                      <span className="font-mono text-xs text-[#5e5e5e]/50">{item.code}</span>
                    </div>
                    <h3 className="font-serif font-medium text-2xl mb-2">{item.title}</h3>
                    <p className="font-sans text-base text-[#5e5e5e] mb-4">{item.desc}</p>
                    <div className="w-full h-1 bg-[#e2e2e2] rounded-full overflow-hidden">
                      <div className="bg-black h-full rounded-full transition-all duration-1000" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e] mb-8">Interaction Activity</h2>
              <div className="p-10 rounded-xl border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
                <div className="flex items-end justify-between gap-2 h-40 mb-8">
                  {ACTIVITY_HEIGHTS.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm hover:bg-black transition-all duration-300 cursor-pointer"
                      style={{ height: `${h}%`, background: i === 2 ? "#000" : "#e2e2e2" }} />
                  ))}
                </div>
                <div className="flex justify-between font-mono text-xs text-[#5e5e5e]/50 uppercase">
                  {DAYS.map((d) => <span key={d}>{d}</span>)}
                </div>
              </div>
            </section>
          </div>

          {/* Right — Health Log + Refinement */}
          <div className="md:col-span-5 space-y-12">
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">Health Log</h2>
                {logs.length > 3 && (
                  <button
                    onClick={() => setShowAllLogs((v) => !v)}
                    className="font-mono text-xs text-black underline cursor-pointer hover:text-[#5e5e5e] transition-colors">
                    {showAllLogs ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
              <div className="space-y-0">
                {logs.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[#cfc4c5] rounded-xl">
                    <span className="material-symbols-outlined text-[#cfc4c5] text-4xl block mb-3">folder_open</span>
                    <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">No health logs yet</p>
                    <Link href="/ai-guidance" className="mt-4 inline-block font-sans text-xs font-semibold tracking-[0.2em] uppercase text-black underline">
                      Start AI Analysis →
                    </Link>
                  </div>
                ) : (
                  visibleLogs.map((log, i) => (
                    <div key={i} className="reveal-item py-6 group cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <span className="material-symbols-outlined opacity-40 group-hover:opacity-100 transition-opacity"
                            style={{ color: log.severity === "high" ? "#ba1a1a" : log.severity === "low" ? "#50a14f" : "#986801" }}>
                            {log.severity === "high" ? "warning" : log.severity === "low" ? "check_circle" : "info"}
                          </span>
                          <div>
                            <p className="font-serif font-medium text-sm mb-1">{log.event_date}: {log.type}</p>
                            <p className="font-mono text-[10px] text-[#5e5e5e]">{log.note ?? log.location ?? "—"}</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[#5e5e5e] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e] mb-8">Refinement</h2>
              <div className="grid grid-cols-2 gap-4">
                {REFINEMENT_ITEMS.map((item) => (
                  <button key={item.label}
                    onClick={item.action}
                    className="p-6 rounded-xl border border-[#cfc4c5] bg-white flex flex-col items-center gap-3 hover:border-black hover:bg-[#f3f3f4] transition-all group">
                    <span className="material-symbols-outlined text-black group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] group-hover:text-black transition-colors">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Local Influence Index */}
        <section className="mt-24 border-t border-[#cfc4c5] pt-24 flex flex-col md:flex-row gap-12 items-center">
          <div className="w-full md:w-1/2">
            <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-6">Impact</span>
            <h2 className="font-serif text-[42px] font-light leading-[1.3] mb-6">Your Local Influence Index</h2>
            <p className="font-sans text-base text-[#5e5e5e] leading-relaxed mb-8">
              Your reports have contributed to a 12% decrease in vector-borne risks within your immediate 5km radius this month. Intentional tracking is the first step toward universal eradication.
            </p>
            <Link href="/heatmap"
              className="flex items-center gap-3 font-sans text-xs font-semibold tracking-[0.2em] uppercase text-black hover:text-[#5e5e5e] transition-colors w-fit">
              View Heatmap Influence
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="w-full md:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden">
            <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80"
              alt="Landscape"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(1)" }} />
          </div>
        </section>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.5);opacity:.8} }
        .reveal-item { border-top: 1px solid #cfc4c5; position: relative; }
        .reveal-item::after { content:''; position:absolute; bottom:-1px; left:0; width:33%; height:2px; background:#000; transition:width .4s cubic-bezier(.4,0,.2,1); }
        .reveal-item:hover::after { width:100%; }
      `}</style>
    </div>
  );
}
