"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, HealthLog, Mission, RiskEvent } from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────────────────
type CompletedMission = {
  id: string;
  completed_at: string | null;
  missions: Mission | null;
};

// Day labels — Monday-first
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// JS getDay() is Sun=0…Sat=6; convert to Mon=0…Sun=6
function jsToMonFirst(jsDay: number) {
  return (jsDay + 6) % 7;
}

const RISK_COLORS: Record<string, string> = {
  HIGH:   "#ba1a1a",
  MEDIUM: "#986801",
  LOW:    "#50a14f",
};

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = createClient();

  // ── Core data ─────────────────────────────────────────────────────────────
  const [profile,           setProfile]           = useState<Profile | null>(null);
  const [email,             setEmail]             = useState("");
  const [logs,              setLogs]              = useState<HealthLog[]>([]);
  const [allLogs,           setAllLogs]           = useState<HealthLog[] | null>(null);
  const [loadingAllLogs,    setLoadingAllLogs]    = useState(false);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [activityData,      setActivityData]      = useState<number[]>([10, 10, 10, 10, 10, 10, 10]);
  const [totalMissions,     setTotalMissions]     = useState(0);
  const [riskEvents,        setRiskEvents]        = useState<RiskEvent[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showAllLogs,    setShowAllLogs]    = useState(false);
  const [showPrivacy,    setShowPrivacy]    = useState(false);
  const [showAlerts,     setShowAlerts]     = useState(false);
  const [toast,          setToast]          = useState("");
  const [exporting,      setExporting]      = useState(false);
  const [userId,         setUserId]         = useState<string | null>(null);

  // ── Item 9: account delete state ─────────────────────────────────────────
  const [deleteStep,     setDeleteStep]     = useState<0 | 1 | 2>(0);

  // ── Load all profile data ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");

      // Profile row
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      // Health logs (latest 10)
      const { data: healthLogs } = await supabase
        .from("health_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: false })
        .limit(10);
      if (healthLogs) setLogs(healthLogs);

      // Total completed missions count (all time — used in stats)
      const { count: missionCount } = await supabase
        .from("user_missions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (missionCount !== null) setTotalMissions(missionCount);

      // Latest 4 completed missions with details (for Guardian Status display)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: umData } = await (supabase as any)
        .from("user_missions")
        .select("id, completed_at, missions(*)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(4);
      if (umData) {
        setCompletedMissions(umData as CompletedMission[]);
      }

      // Activity per weekday — last 7 days of user_missions
      const since = new Date();
      since.setDate(since.getDate() - 7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recentActivity } = await (supabase as any)
        .from("user_missions")
        .select("completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", since.toISOString());

      const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon…Sun
      if (recentActivity) {
        (recentActivity as { completed_at: string | null }[]).forEach(({ completed_at }) => {
          if (!completed_at) return;
          const idx = jsToMonFirst(new Date(completed_at).getDay());
          counts[idx]++;
        });
      }
      const maxCount = Math.max(...counts, 1);
      setActivityData(counts.map((c) => Math.round((c / maxCount) * 80) + 10));

      // ── Item 8: load latest 3 risk_events ──
      const { data: events } = await supabase
        .from("risk_events")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(3);
      if (events) setRiskEvents(events);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Parse the structured note saved by AI Guidance into symptoms + findings */
  function parseLogNote(note: string | null | undefined): { symptoms: string[] | null; results: string | null } {
    if (!note) return { symptoms: null, results: null };
    // New format: "Symptoms: fever, cough | Malaria 72% · Dengue 45%"
    if (note.includes("Symptoms:") && note.includes("|")) {
      const parts   = note.split("|");
      const rawSymp = parts[0]?.replace("Symptoms:", "").trim() ?? "";
      const symptoms = rawSymp ? rawSymp.split(",").map((s) => s.trim()).filter(Boolean) : null;
      return { symptoms: symptoms?.length ? symptoms : null, results: parts[1]?.trim() ?? null };
    }
    // Legacy format: "AI Analysis — Malaria 72% · ..."
    return { symptoms: null, results: note.replace(/^AI Analysis — /, "").trim() };
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // ── Item 7: View All pagination — fetch all logs when toggled ─────────────
  async function handleToggleAllLogs() {
    const next = !showAllLogs;
    setShowAllLogs(next);
    if (next && logs.length === 10 && allLogs === null && userId) {
      setLoadingAllLogs(true);
      const { data } = await supabase
        .from("health_logs")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: false });
      if (data) setAllLogs(data);
      setLoadingAllLogs(false);
    }
  }

  // Real JSON export of health logs
  async function handleExport() {
    if (!userId || exporting) return;
    setExporting(true);
    const { data: exportData } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: false });

    if (exportData && exportData.length > 0) {
      const json  = JSON.stringify(exportData, null, 2);
      const blob  = new Blob([json], { type: "application/json" });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = `panacea-health-logs-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${exportData.length} log entries`);
    } else {
      showToast("No health logs to export yet");
    }
    setExporting(false);
  }

  // Navigate to AI Guidance with health log type as context
  function openLogInAI(log: HealthLog) {
    const disease = log.type?.toLowerCase() ?? "";
    router.push(`/ai-guidance?disease=${encodeURIComponent(disease)}`);
  }

  // ── Item 9: Account deletion ──────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (!userId) return;
    setDeleteStep(2);
    try {
      // Delete user data client-side (auth.users row deleted by DB CASCADE on server)
      await supabase.from("health_logs").delete().eq("user_id", userId);
      await supabase.from("user_missions").delete().eq("user_id", userId);
      await supabase.from("reward_redemptions").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);
      // Sign out
      await supabase.auth.signOut();
      router.push("/?deleted=1");
    } catch {
      showToast("Deletion failed. Please try again.");
      setDeleteStep(0);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName  = profile?.full_name || email.split("@")[0] || "User";
  const tier         = profile?.tier ?? "Community";
  const level        = profile?.guardian_level ?? 1;
  const percentile   = profile?.percentile ?? 0;
  const xp           = profile?.xp ?? 0;

  // Item 7: use allLogs (full set) when expanded and loaded; else first 10
  const baseLogsForDisplay = showAllLogs && allLogs !== null ? allLogs : logs;
  const visibleLogs        = showAllLogs ? baseLogsForDisplay : logs.slice(0, 3);

  const logsThisMonth = logs.filter((l) => {
    const d = new Date(l.event_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Refinement actions — Item 8: Alerts opens real modal
  const REFINEMENT_ITEMS = [
    { icon: "lock",          label: "Privacy",  action: () => setShowPrivacy(true) },
    { icon: "notifications", label: "Alerts",   action: () => setShowAlerts(true)  },
    { icon: "download",      label: "Export",   action: handleExport },
    { icon: "logout",        label: "Logout",   action: handleLogout },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full font-sans text-xs font-semibold tracking-widest uppercase shadow-lg transition-all">
          {toast}
        </div>
      )}

      {/* ── Item 8: Alerts modal ─────────────────────────────────────────────── */}
      {showAlerts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAlerts(false)}
        >
          <div
            className="bg-white rounded-[40px] p-12 max-w-md w-full mx-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  notifications_active
                </span>
              </div>
              <div>
                <h3 className="font-serif font-medium text-2xl">Risk Alerts</h3>
                <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">
                  Latest community events
                </p>
              </div>
            </div>

            {riskEvents.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-sans text-sm text-[#5e5e5e]">No risk events recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {riskEvents.map((ev) => (
                  <div key={ev.id} className="p-5 rounded-2xl border border-[#e2e2e2] bg-[#f9f9f9]">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: RISK_COLORS[ev.level] ?? "#986801" }}
                      />
                      <span
                        className="font-sans text-[10px] font-semibold tracking-widest uppercase"
                        style={{ color: RISK_COLORS[ev.level] ?? "#986801" }}
                      >
                        {ev.level} RISK
                      </span>
                      <span className="font-mono text-[10px] text-[#5e5e5e] ml-auto">
                        {ev.recorded_at
                          ? new Date(ev.recorded_at).toLocaleString("en-US", {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </div>
                    <p className="font-sans text-sm text-[#1a1c1c] leading-relaxed">{ev.description}</p>
                    {ev.location && (
                      <p className="font-mono text-[10px] text-[#5e5e5e] mt-2">📍 {ev.location}</p>
                    )}
                    {ev.temp_celsius !== null && (
                      <div className="flex gap-4 mt-3">
                        {ev.temp_celsius !== null && (
                          <span className="font-mono text-[10px] text-[#5e5e5e]">
                            🌡 {ev.temp_celsius}°C
                          </span>
                        )}
                        {ev.humidity_pct !== null && (
                          <span className="font-mono text-[10px] text-[#5e5e5e]">
                            💧 {ev.humidity_pct}% humidity
                          </span>
                        )}
                        {ev.aqi && (
                          <span className="font-mono text-[10px] text-[#5e5e5e]">
                            AQI: {ev.aqi}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAlerts(false)}
              className="w-full py-3 rounded-full bg-black text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Privacy modal ──────────────────────────────────────────────────── */}
      {showPrivacy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { setShowPrivacy(false); setDeleteStep(0); }}
        >
          <div
            className="bg-white rounded-[40px] p-12 max-w-md w-full mx-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
            </div>
            <h3 className="font-serif font-medium text-2xl mb-3">Your Privacy</h3>
            <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed mb-6">
              PANACEA stores only the health data you explicitly provide. Your identity
              is never shared with third parties or included in community heatmap data.
            </p>
            <div className="space-y-3 mb-8">
              {[
                { icon: "encrypted",        text: "All data encrypted at rest and in transit" },
                { icon: "visibility_off",   text: "Location data blurred to ±500m radius on heatmap" },
                { icon: "person_off",       text: "Community reports are fully anonymised" },
                { icon: "delete_forever",   text: "You can delete your account and all data at any time" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3 p-3 bg-[#f3f3f4] rounded-xl">
                  <span className="material-symbols-outlined text-black text-[18px] mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  <p className="font-sans text-sm text-[#1a1c1c] leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* ── Item 9: Account deletion ── */}
            <div className="border-t border-[#e2e2e2] pt-6 mb-6">
              {deleteStep === 0 && (
                <button
                  onClick={() => setDeleteStep(1)}
                  className="w-full py-3 rounded-full border border-[#ba1a1a] text-[#ba1a1a] font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#ba1a1a] hover:text-white transition-all"
                >
                  Delete Account
                </button>
              )}
              {deleteStep === 1 && (
                <div className="space-y-3">
                  <p className="font-sans text-xs text-[#ba1a1a] text-center leading-relaxed">
                    This will permanently delete your health logs and mission history.
                    Your authentication account will be removed within 24 hours.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full py-3 rounded-full bg-[#ba1a1a] text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#9b1515] transition-all"
                  >
                    Yes, Delete Everything
                  </button>
                  <button
                    onClick={() => setDeleteStep(0)}
                    className="w-full py-3 rounded-full border border-[#e2e2e2] text-[#5e5e5e] font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#f3f3f4] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {deleteStep === 2 && (
                <div className="flex items-center justify-center gap-3 py-3">
                  <span className="material-symbols-outlined text-[#ba1a1a] animate-spin">progress_activity</span>
                  <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">Deleting your data…</p>
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowPrivacy(false); setDeleteStep(0); }}
              className="w-full py-3 rounded-full bg-black text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      <main className="pt-20 px-16 max-w-[1200px] mx-auto pb-32">

        {/* ── Profile Header ─────────────────────────────────────────────── */}
        <header className="py-16 md:py-24 flex flex-col md:flex-row gap-12 items-center md:items-start border-b border-[#cfc4c5] mb-20">
          <div className="relative group flex-shrink-0">
            <div
              className="w-48 h-48 rounded-full overflow-hidden border border-[#cfc4c5]"
              style={{ filter: "grayscale(1)", transition: "filter 0.7s" }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "grayscale(0)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "grayscale(1)")}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                /* Initials fallback when no avatar_url */
                <div className="w-full h-full bg-[#e2e2e2] flex items-center justify-center">
                  <span className="font-serif text-5xl font-light text-[#5e5e5e] select-none uppercase">
                    {displayName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-black text-white p-3 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">
                Guardian Level {level}
              </span>
              <div className="w-3 h-3 rounded-full bg-black"
                style={{ animation: "pulse 3s ease-in-out infinite" }} />
            </div>
            <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight mb-2">{displayName}</h1>
            <p className="font-sans text-sm text-[#5e5e5e] mb-4">{email}</p>
            <p className="font-sans text-[28px] font-light leading-[1.2] tracking-[-0.01em] text-[#5e5e5e] max-w-2xl">
              Refining personal wellness through data-driven insight and environmental stewardship.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8">
              {[
                { icon: "eco",        label: `${tier} · Level ${level}` },
                { icon: "monitoring", label: `${percentile}th Percentile` },
                { icon: "star",       label: `${xp} XP` },
              ].map((badge) => (
                <div key={badge.label}
                  className="px-6 py-3 rounded-xl flex items-center gap-3 border border-[#cfc4c5]"
                  style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
                  <span className="material-symbols-outlined text-black">{badge.icon}</span>
                  <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── Bento Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Left — Guardian Status + Activity */}
          <div className="md:col-span-7 space-y-12">

            {/* Guardian Status — real completed missions */}
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">
                  Guardian Status
                </h2>
                <Link href="/guardian"
                  className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-black underline hover:text-[#5e5e5e] transition-colors">
                  View All Missions →
                </Link>
              </div>

              {completedMissions.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-[#cfc4c5] rounded-xl">
                  <span className="material-symbols-outlined text-[#cfc4c5] text-4xl block mb-3">
                    emoji_events
                  </span>
                  <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest mb-3">
                    No missions completed yet
                  </p>
                  <Link href="/guardian"
                    className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-black underline">
                    Start Today →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {completedMissions.map((um, idx) => {
                    const m = um.missions;
                    if (!m) return null;
                    const xpProgress = Math.min(((xp % 500) / 500) * 100, 100);
                    return (
                      <div key={um.id}
                        className="p-8 rounded-xl border border-[#cfc4c5] hover:bg-[#f3f3f4] transition-colors"
                        style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
                        <div className="flex justify-between items-start mb-6">
                          <span className="material-symbols-outlined text-4xl text-black">
                            {m.icon ?? "task_alt"}
                          </span>
                          <span className="font-mono text-xs text-[#5e5e5e]/50">
                            {um.completed_at
                              ? new Date(um.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "—"}
                          </span>
                        </div>
                        <h3 className="font-serif font-medium text-2xl mb-2">{m.title}</h3>
                        <p className="font-sans text-sm text-[#5e5e5e] mb-1">{m.description ?? ""}</p>
                        <p className="font-mono text-[10px] text-[#5e5e5e] mb-4">+{m.xp_reward ?? 0} XP</p>
                        <div className="w-full h-1 bg-[#e2e2e2] rounded-full overflow-hidden">
                          <div
                            className="bg-black h-full rounded-full transition-all duration-1000"
                            style={{ width: `${idx === 0 ? xpProgress : 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Interaction Activity — real 7-day mission data */}
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">
                  Interaction Activity
                </h2>
                <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">
                  Last 7 days
                </span>
              </div>
              <div className="p-10 rounded-xl border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
                <div className="flex items-end justify-between gap-2 h-40 mb-8">
                  {activityData.map((h, i) => (
                    <div key={i}
                      className="flex-1 rounded-sm hover:bg-black transition-all duration-300 cursor-default group relative"
                      style={{ height: `${h}%`, background: i === new Date().getDay() - 1 || (i === 6 && new Date().getDay() === 0) ? "#000" : "#e2e2e2" }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-mono uppercase tracking-wide pointer-events-none">
                        {activityData[i] > 10 ? `${Math.round((activityData[i] - 10) / 0.8)} act.` : "None"}
                      </div>
                    </div>
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

            {/* Health Log — Item 7: real View All */}
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e]">
                  Health Log
                </h2>
                {logs.length > 3 && (
                  <button
                    onClick={handleToggleAllLogs}
                    className="font-mono text-xs text-black underline cursor-pointer hover:text-[#5e5e5e] transition-colors">
                    {loadingAllLogs ? "Loading…" : showAllLogs ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
              <div className="space-y-0">
                {logs.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[#cfc4c5] rounded-xl">
                    <span className="material-symbols-outlined text-[#cfc4c5] text-4xl block mb-3">
                      folder_open
                    </span>
                    <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">
                      No health logs yet
                    </p>
                    <Link href="/ai-guidance"
                      className="mt-4 inline-block font-sans text-xs font-semibold tracking-[0.2em] uppercase text-black underline">
                      Start AI Analysis →
                    </Link>
                  </div>
                ) : (
                  visibleLogs.map((log, i) => {
                    const { symptoms, results } = parseLogNote(log.note);
                    return (
                      <button
                        key={i}
                        onClick={() => openLogInAI(log)}
                        className="reveal-item w-full text-left py-6 group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <span
                              className="material-symbols-outlined opacity-40 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
                              style={{ color: log.severity === "high" ? "#ba1a1a" : log.severity === "low" ? "#50a14f" : "#986801" }}
                            >
                              {log.severity === "high" ? "warning" : log.severity === "low" ? "check_circle" : "info"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-serif font-medium text-sm mb-1.5">
                                {log.event_date} · <span className="capitalize">{log.type}</span>
                              </p>
                              {symptoms && symptoms.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {symptoms.map((s) => (
                                    <span
                                      key={s}
                                      className="font-mono text-[8px] px-1.5 py-0.5 bg-[#f3f3f4] border border-[#e2e2e2] rounded-full uppercase tracking-wider text-[#5e5e5e]"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="font-mono text-[10px] text-[#5e5e5e] truncate">
                                {results ?? log.location ?? "—"}
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[#5e5e5e] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                            arrow_forward
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* Refinement */}
            <section>
              <h2 className="font-sans text-[10px] font-semibold tracking-[0.3em] uppercase text-[#5e5e5e] mb-8">
                Refinement
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {REFINEMENT_ITEMS.map((item) => (
                  <button key={item.label}
                    onClick={item.action}
                    disabled={item.label === "Export" && exporting}
                    className="p-6 rounded-xl border border-[#cfc4c5] bg-white flex flex-col items-center gap-3 hover:border-black hover:bg-[#f3f3f4] transition-all group disabled:opacity-50">
                    <span className="material-symbols-outlined text-black group-hover:scale-110 transition-transform">
                      {item.label === "Export" && exporting ? "hourglass_empty" : item.icon}
                    </span>
                    <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] group-hover:text-black transition-colors">
                      {item.label === "Export" && exporting ? "Exporting..." : item.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── Local Influence Index — real stats ────────────────────────── */}
        <section className="mt-24 border-t border-[#cfc4c5] pt-24 flex flex-col md:flex-row gap-12 items-center">
          <div className="w-full md:w-1/2">
            <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-6">
              Impact
            </span>
            <h2 className="font-serif text-[42px] font-light leading-[1.3] mb-6">
              Your Local Influence Index
            </h2>

            {/* Real stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { value: logs.length,      label: "Health Logs",        icon: "medical_information" },
                { value: totalMissions,    label: "Missions Done",       icon: "task_alt" },
                { value: logsThisMonth,    label: "Logs This Month",     icon: "calendar_month" },
              ].map(({ value, label, icon }) => (
                <div key={label} className="p-4 border border-[#cfc4c5] rounded-2xl bg-white text-center">
                  <span className="material-symbols-outlined text-black text-[20px] block mb-2">{icon}</span>
                  <p className="font-serif text-2xl font-semibold">{value}</p>
                  <p className="font-sans text-[9px] font-semibold tracking-widest uppercase text-[#5e5e5e] mt-1">{label}</p>
                </div>
              ))}
            </div>

            <p className="font-sans text-base text-[#5e5e5e] leading-relaxed mb-8">
              {logs.length > 0
                ? `You have submitted ${logs.length} health log${logs.length > 1 ? "s" : ""} and completed ${totalMissions} community mission${totalMissions !== 1 ? "s" : ""}. Your reports contribute directly to the community heatmap and local outbreak detection.`
                : "Start logging symptoms and completing missions to build your community health impact. Every report helps protect your local area."}
            </p>

            <Link href="/heatmap"
              className="flex items-center gap-3 font-sans text-xs font-semibold tracking-[0.2em] uppercase text-black hover:text-[#5e5e5e] transition-colors w-fit">
              View Heatmap Influence
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="w-full md:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80"
              alt="Landscape"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(1)" }}
            />
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
