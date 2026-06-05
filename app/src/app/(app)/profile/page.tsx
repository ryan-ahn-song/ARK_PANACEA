"use client";

import { useState } from "react";
import Link from "next/link";

const GUARDIAN_ITEMS = [
  { icon: "bedtime",      code: "GS-001", title: "Mosquito Nets",   desc: "4 Units distributed in region Alpha.",      progress: 75  },
  { icon: "clean_hands",  code: "GS-042", title: "Sanitation Kits", desc: "Earned for 30-day streak reporting.",        progress: 100 },
];

const ACTIVITY_HEIGHTS = [40, 65, 100, 30, 55, 88, 45];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HEALTH_LOGS = [
  { date: "Feb 12", title: "Elevated Temp",    sub: "38.2°C · Alpha Sector",       severity: "high"   },
  { date: "Feb 10", title: "Clear Status",     sub: "Normal Metrics · Home Base",  severity: "ok"     },
  { date: "Feb 08", title: "Fatigue Reported", sub: "Mild Fatigue · Gamma Sector", severity: "mid"    },
];

const SEVERITY_COLOR: Record<string, string> = {
  high: "#ba1a1a",
  ok:   "#50a14f",
  mid:  "#986801",
};
const SEVERITY_ICON: Record<string, string> = {
  high: "thermostat",
  ok:   "check_circle",
  mid:  "warning_amber",
};

export default function ProfilePage() {
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full font-sans text-xs font-semibold tracking-widest uppercase shadow-lg">
          {toast}
        </div>
      )}

      <main className="max-w-[780px] mx-auto px-6 pt-10 pb-24">

        {/* ── Profile Hero ── */}
        <section className="flex items-start gap-8 py-10">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden border border-[#e0e0e0]">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80"
                alt="Elena Vance"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-black rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">
                Global Guardian
              </span>
              <div className="w-2 h-2 rounded-full bg-black" />
            </div>
            <h1 className="font-serif font-semibold text-[36px] leading-tight mb-2">Elena Vance</h1>
            <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed mb-5 max-w-md">
              Refining personal wellness through data-driven insight and environmental stewardship.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#d8d8d8] bg-white">
                <span className="material-symbols-outlined text-black" style={{ fontSize: "15px", fontVariationSettings: "'FILL' 1" }}>shield</span>
                <span className="font-sans text-[10px] font-semibold tracking-wide">Community Tier 3</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#d8d8d8] bg-white">
                <span className="material-symbols-outlined text-black" style={{ fontSize: "15px" }}>monitoring</span>
                <span className="font-sans text-[10px] font-semibold tracking-wide">94th Percentile</span>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-[#e0e0e0] mb-10" />

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-8">

            {/* Guardian Status */}
            <div>
              <p className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-4">
                Guardian Status
              </p>
              <div className="flex flex-col gap-3">
                {GUARDIAN_ITEMS.map((item) => (
                  <div key={item.code} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="material-symbols-outlined text-black" style={{ fontSize: "22px" }}>{item.icon}</span>
                      <span className="font-mono text-[9px] text-[#aaa]">{item.code}</span>
                    </div>
                    <div className="font-serif font-semibold text-[17px] mb-1">{item.title}</div>
                    <p className="font-sans text-xs text-[#5e5e5e] mb-3">{item.desc}</p>
                    <div className="h-1 bg-[#ebebeb] rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interaction Activity */}
            <div>
              <p className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-4">
                Interaction Activity
              </p>
              <div className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                <div className="flex items-end gap-2 h-28 mb-3">
                  {ACTIVITY_HEIGHTS.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${h}%`,
                        background: i === 2 ? "#000" : "#e2e2e2",
                      }} />
                  ))}
                </div>
                <div className="flex justify-between">
                  {DAYS.map((d) => (
                    <span key={d} className="font-sans text-[9px] text-[#aaa] uppercase tracking-wide flex-1 text-center">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-8">

            {/* Health Log */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">
                  Health Log
                </p>
                <button className="font-sans text-[10px] font-semibold text-[#5e5e5e] hover:text-black transition-colors underline underline-offset-2">
                  View All
                </button>
              </div>
              <div className="bg-white rounded-xl border border-[#e8e8e8] divide-y divide-[#f0f0f0]">
                {HEALTH_LOGS.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-4">
                    <span className="material-symbols-outlined mt-0.5 flex-shrink-0"
                      style={{ fontSize: "16px", color: SEVERITY_COLOR[log.severity], fontVariationSettings: "'FILL' 1" }}>
                      {SEVERITY_ICON[log.severity]}
                    </span>
                    <div>
                      <div className="font-sans text-xs font-semibold text-black">{log.date}: {log.title}</div>
                      <div className="font-sans text-[10px] text-[#888] mt-0.5">{log.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refinement */}
            <div>
              <p className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-4">
                Refinement
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "person",   label: "Privacy", action: () => showToast("Privacy settings coming soon") },
                  { icon: "notifications", label: "Alerts",   action: () => showToast("Alert preferences coming soon") },
                  { icon: "database", label: "Export",  action: () => showToast("Data export coming soon") },
                  { icon: "logout",   label: "Logout",  action: () => showToast("Logged out") },
                ].map((item) => (
                  <button key={item.label} onClick={item.action}
                    className="bg-white rounded-xl border border-[#e8e8e8] py-5 flex flex-col items-center gap-2 hover:border-black hover:bg-[#fafafa] transition-all">
                    <span className="material-symbols-outlined text-black" style={{ fontSize: "20px" }}>{item.icon}</span>
                    <span className="font-sans text-[10px] font-semibold tracking-wide text-[#5e5e5e]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#e0e0e0] my-12" />

        {/* ── Local Influence Index ── */}
        <section className="flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1">
            <h2 className="font-serif font-semibold text-[30px] leading-tight mb-4">
              Your Local<br />Influence Index
            </h2>
            <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed mb-6 max-w-xs">
              Your reports have contributed to a 12% decrease in vector-borne risks within your immediate 5km radius this month. Intentional tracking is the first step toward universal eradication.
            </p>
            <Link href="/heatmap"
              className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-black underline underline-offset-4 flex items-center gap-2 hover:text-[#5e5e5e] transition-colors w-fit">
              View Heatmap Influence
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_forward</span>
            </Link>
          </div>
          <div className="w-full md:w-[55%] rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
              alt="Landscape"
              className="w-full h-full object-cover"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
