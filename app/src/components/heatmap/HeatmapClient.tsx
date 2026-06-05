"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Circle } from "leaflet";
import Link from "next/link";

type Filter = "ALL" | "MALARIA" | "DENGUE" | "TB";

type Hotspot = {
  lat: number;
  lng: number;
  intensity: number;
  tag: Filter;
};

const ALL_HOTSPOTS: Hotspot[] = [
  // Nairobi hotspots
  { lat: -1.2921, lng: 36.8219, intensity: 0.9, tag: "MALARIA" },
  { lat: -1.2634, lng: 36.7943, intensity: 0.6, tag: "MALARIA" },
  { lat: -1.3032, lng: 36.8123, intensity: 0.4, tag: "DENGUE" },
  { lat: -1.2100, lng: 36.8850, intensity: 0.75, tag: "DENGUE" },
  { lat: -1.3200, lng: 36.7200, intensity: 0.3, tag: "TB" },
  { lat: -1.2800, lng: 36.7600, intensity: 0.5, tag: "TB" },
  { lat: -1.2450, lng: 36.8600, intensity: 0.65, tag: "MALARIA" },
  { lat: -1.3100, lng: 36.8400, intensity: 0.55, tag: "DENGUE" },
  { lat: -1.2700, lng: 36.8900, intensity: 0.4,  tag: "TB" },
];

const NEIGHBORHOODS = [
  { name: "Upper Hill District", trend: "Rising",  trendPct: "+12%", status: "Rising",  color: "#ba1a1a", filter: "MALARIA" as Filter },
  { name: "Westlands Core",      trend: "Stable",  trendPct: "",      status: "Stable",  color: "#50a14f", filter: "ALL"     as Filter },
  { name: "Kilimani Sector",     trend: "Rising",  trendPct: "+4%",   status: "Rising",  color: "#ba1a1a", filter: "DENGUE"  as Filter },
  { name: "Karen Enclave",       trend: "Falling", trendPct: "",      status: "Low Data",color: "#888",    filter: "TB"      as Filter },
];

const TAG_COLORS: Record<Filter, string> = {
  ALL:    "#000",
  MALARIA:"#50a14f",
  DENGUE: "#986801",
  TB:     "#a626a4",
};

function renderMarkers(
  L: typeof import("leaflet"),
  map: LeafletMap,
  filter: Filter,
  circleLayersRef: React.MutableRefObject<Circle[]>
) {
  circleLayersRef.current.forEach((c) => c.remove());
  circleLayersRef.current = [];

  const spots = filter === "ALL" ? ALL_HOTSPOTS : ALL_HOTSPOTS.filter((s) => s.tag === filter);
  const tagColor = filter === "ALL" ? undefined : TAG_COLORS[filter];

  spots.forEach((spot) => {
    const c = tagColor ?? (spot.intensity > 0.7 ? "#ba1a1a" : spot.intensity > 0.4 ? "#986801" : "#50a14f");
    const outer = L.circle([spot.lat, spot.lng], {
      color: "transparent",
      fillColor: c,
      fillOpacity: 0.18 + spot.intensity * 0.28,
      radius: 800 + spot.intensity * 1000,
    }).addTo(map);
    const inner = L.circle([spot.lat, spot.lng], {
      color: c,
      fillColor: c,
      fillOpacity: 0.9,
      radius: 90,
      weight: 1,
    }).addTo(map);
    circleLayersRef.current.push(outer, inner);
  });
}

const METRICS: Record<Filter, { incidence: string; level: string; participants: string }> = {
  ALL:     { incidence: "INCIDENCE", level: "LOW",      participants: "12,482" },
  MALARIA: { incidence: "INCIDENCE", level: "MODERATE", participants: "4,230"  },
  DENGUE:  { incidence: "INCIDENCE", level: "HIGH",     participants: "3,910"  },
  TB:      { incidence: "INCIDENCE", level: "LOW",      participants: "2,180"  },
};

const LEVEL_COLOR: Record<string, string> = {
  LOW:      "#50a14f",
  MODERATE: "#986801",
  HIGH:     "#ba1a1a",
};

export default function HeatmapClient() {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleLayersRef = useRef<Circle[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    async function initMap() {
      const L = await import("leaflet");
      const map = L.map(containerRef.current!, {
        center: [-1.2921, 36.8219],
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "©OpenStreetMap ©CartoDB",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      renderMarkers(L, map, "ALL", circleLayersRef);
    }

    initMap();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    async function update() {
      const L = await import("leaflet");
      renderMarkers(L, mapRef.current!, activeFilter, circleLayersRef);
    }
    update();
  }, [activeFilter]);

  const m = METRICS[activeFilter];
  const levelColor = LEVEL_COLOR[m.level];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e8e8e8]">

      {/* ── Full-screen Map ── */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* ── TopNav overlay ── */}
      <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 h-14"
        style={{ background: "rgba(249,249,249,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e8e8" }}>
        <Link href="/" className="font-serif font-semibold text-sm tracking-widest text-black uppercase">
          PANACEA
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Risk",        href: "/dashboard"    },
            { label: "Body Atlas",  href: "/body-atlas"   },
            { label: "AI Guidance", href: "/ai-guidance"  },
            { label: "Heatmap",     href: "/heatmap"      },
          ].map((l) => (
            <Link key={l.href} href={l.href}
              className={`font-sans text-xs tracking-wide transition-colors ${
                l.href === "/heatmap"
                  ? "text-black font-semibold underline underline-offset-4"
                  : "text-[#5e5e5e] hover:text-black"
              }`}>
              {l.label}
            </Link>
          ))}
        </div>
        <Link href="/dashboard">
          <button className="px-5 py-2 rounded-full bg-black text-white font-sans text-xs font-semibold tracking-wider uppercase hover:bg-[#333] transition-colors">
            Join
          </button>
        </Link>
      </nav>

      {/* ── Top-left: Live Monitoring Card ── */}
      <div className="absolute z-20 rounded-xl border border-[#cfc4c5] p-6"
        style={{
          top: "80px", left: "24px",
          width: "320px",
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-2">
          Live Monitoring
        </div>
        <div className="font-serif font-semibold text-[28px] leading-tight mb-3">
          Nairobi Activity
        </div>
        <p className="font-sans text-xs leading-relaxed text-[#4c4546]">
          Real-time symptom distribution across your local region. All data is end-to-end encrypted and spatially blurred for absolute privacy.
        </p>
      </div>

      {/* ── Top-right: Incidence + Participants ── */}
      <div className="absolute z-20 rounded-xl border border-[#cfc4c5] flex"
        style={{
          top: "80px", right: "24px",
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="px-7 py-5 border-r border-[#cfc4c5]">
          <div className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-1">
            {m.incidence}
          </div>
          <div className="font-serif font-semibold text-[22px] leading-none" style={{ color: levelColor }}>
            {m.level}
          </div>
        </div>
        <div className="px-7 py-5">
          <div className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-1">
            Participants
          </div>
          <div className="font-serif font-semibold text-[22px] leading-none text-black">
            {m.participants}
          </div>
        </div>
      </div>

      {/* ── Bottom-left: Neighborhood Trends ── */}
      <div className="absolute z-20 rounded-xl border border-[#cfc4c5] p-5"
        style={{
          bottom: "100px", left: "24px",
          width: "280px",
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">
            Neighborhood Trends
          </span>
          <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "14px" }}>trending_up</span>
        </div>
        <div className="flex flex-col gap-2">
          {NEIGHBORHOODS.map((n) => {
            const isActive = activeFilter === "ALL" || activeFilter === n.filter || n.filter === "ALL";
            return (
              <button key={n.name}
                onClick={() => setActiveFilter(n.filter === "ALL" ? "ALL" : n.filter)}
                className={`flex items-center justify-between w-full py-1 transition-opacity ${isActive ? "opacity-100" : "opacity-40"}`}>
                <span className="font-sans text-xs font-medium text-[#1a1c1c]">{n.name}</span>
                <div className="flex items-center gap-1.5">
                  {/* trend bar */}
                  <div className="w-8 h-0.5 rounded-full" style={{ background: n.color }} />
                  <span className="font-sans text-[10px] font-semibold tracking-wide"
                    style={{ color: n.color }}>
                    {n.status === "Low Data" ? "Low Data" : n.status === "Rising" ? (n.trendPct ? `Rising` : "Rising") : n.status}
                    {n.trendPct ? ` ${n.trendPct}` : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom-center: Anonymization Flow + CTA ── */}
      <div className="absolute z-20 flex flex-col items-center gap-3"
        style={{ bottom: "24px", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>

        {/* Anonymization pill */}
        <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-[#cfc4c5]"
          style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)" }}>
          <div className="flex flex-col items-center gap-0.5">
            <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "18px" }}>person</span>
            <span className="font-sans text-[8px] font-semibold tracking-[0.15em] uppercase text-[#5e5e5e]">Identity</span>
          </div>
          <span className="text-[#5e5e5e] text-sm">→</span>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
            <span className="font-sans text-[8px] font-semibold tracking-[0.15em] uppercase text-black">Anonymize</span>
          </div>
          <span className="text-[#5e5e5e] text-sm">→</span>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-5 h-5 rounded-full border border-[#cfc4c5] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-black" />
            </div>
            <span className="font-sans text-[8px] font-semibold tracking-[0.15em] uppercase text-[#5e5e5e]">Map Dot</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3">
          <button className="px-5 py-2.5 rounded-full border border-[#7e7576] font-sans text-[10px] font-semibold tracking-wider uppercase text-black hover:bg-black hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)" }}>
            Contribute Anonymously →
          </button>
          <button className="px-5 py-2.5 rounded-full bg-black text-white font-sans text-[10px] font-semibold tracking-wider uppercase hover:bg-[#333] transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
            Report Symptoms
          </button>
        </div>
      </div>

      {/* ── Bottom-right: Risk Scale Legend ── */}
      <div className="absolute z-20 rounded-xl border border-[#cfc4c5] p-4"
        style={{
          bottom: "100px", right: "24px",
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-3">
          Risk Scale
        </div>
        <div className="flex flex-col gap-2">
          {[
            { color: "#ba1a1a", label: "High Risk Area",       pulse: true  },
            { color: "#986801", label: "Moderate Activity",    pulse: false },
            { color: "#9e9e9e", label: "Stable/Low Activity",  pulse: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.pulse ? "animate-pulse" : ""}`}
                style={{ background: item.color }} />
              <span className="font-sans text-[10px] font-medium text-[#1a1c1c]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Disease Filter pills (top-center) ── */}
      <div className="absolute z-20 flex gap-2"
        style={{ top: "80px", left: "50%", transform: "translateX(-50%)" }}>
        {(["ALL", "MALARIA", "DENGUE", "TB"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full font-sans text-[9px] font-semibold tracking-[0.15em] uppercase transition-all border ${
              activeFilter === f
                ? "bg-black text-white border-black"
                : "border-[#7e7576] text-[#1a1c1c] hover:bg-[#e2e2e2]"
            }`}
            style={activeFilter !== f ? { background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)" } : {}}>
            {f}
          </button>
        ))}
      </div>

      {/* ── Zoom controls ── */}
      <div className="absolute z-20 flex flex-col gap-1"
        style={{ bottom: "100px", right: "260px" }}>
        <button
          onClick={async () => { mapRef.current?.zoomIn(); }}
          className="w-9 h-9 rounded-lg border border-[#cfc4c5] flex items-center justify-center font-sans text-lg font-light text-black hover:bg-[#f0f0f0] transition-colors"
          style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)" }}>
          +
        </button>
        <button
          onClick={async () => { mapRef.current?.zoomOut(); }}
          className="w-9 h-9 rounded-lg border border-[#cfc4c5] flex items-center justify-center font-sans text-lg font-light text-black hover:bg-[#f0f0f0] transition-colors"
          style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)" }}>
          −
        </button>
      </div>

      {/* ── Footer bar ── */}
      <div className="absolute z-20 bottom-0 left-0 right-0 flex items-center justify-between px-8 h-10 border-t border-[#e8e8e8]"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}>
        <span className="font-serif font-semibold text-xs tracking-widest text-black uppercase">PANACEA</span>
        <div className="flex items-center gap-6">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a key={l} href="#" className="font-sans text-[9px] font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors">{l}</a>
          ))}
          <span className="font-sans text-[9px] text-[#5e5e5e]">© 2024 PANACEA Digital Health</span>
        </div>
      </div>
    </div>
  );
}
