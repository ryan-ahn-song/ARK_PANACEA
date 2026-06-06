"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Circle } from "leaflet";
import { createClient } from "@/lib/supabase/client";
import type { HeatmapReport } from "@/lib/supabase/types";

type Filter = "ALL" | "MALARIA" | "DENGUE" | "TB";
type Hotspot = { lat: number; lng: number; intensity: number; tag: Filter };

// ── Fallback data used while DB loads or if table is empty ──────────────────
const FALLBACK_HOTSPOTS: Hotspot[] = [
  { lat: -1.2921, lng: 36.8219, intensity: 0.9,  tag: "MALARIA" },
  { lat: -1.2634, lng: 36.7943, intensity: 0.6,  tag: "MALARIA" },
  { lat: -1.3032, lng: 36.8123, intensity: 0.4,  tag: "DENGUE"  },
  { lat: -1.2100, lng: 36.8850, intensity: 0.75, tag: "DENGUE"  },
  { lat: -1.3200, lng: 36.7200, intensity: 0.3,  tag: "TB"      },
  { lat: -1.2800, lng: 36.7600, intensity: 0.5,  tag: "TB"      },
  { lat: -1.2450, lng: 36.8600, intensity: 0.65, tag: "MALARIA" },
];

const FALLBACK_NEIGHBORHOODS = [
  { num: "01", name: "Upper Hill District", trend: "Rising +12%", icon: "trending_up",   color: "#ba1a1a", filter: "MALARIA" as Filter },
  { num: "02", name: "Westlands Core",       trend: "Stable",      icon: "trending_flat", color: "#50a14f", filter: "ALL"     as Filter },
  { num: "03", name: "Kilimani Sector",      trend: "Rising +4%",  icon: "trending_up",   color: "#ba1a1a", filter: "DENGUE"  as Filter },
  { num: "04", name: "Karen Enclave",        trend: "Low Data",    icon: "remove",        color: "#5e5e5e", filter: "TB"      as Filter },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const TAG_COLORS: Record<Filter, string> = {
  ALL: "#000", MALARIA: "#50a14f", DENGUE: "#986801", TB: "#a626a4",
};

/** Normalize a DB disease_tag string to the Filter union */
function toFilter(tag: string | null | undefined): Filter {
  const u = tag?.toUpperCase() ?? "";
  if (u === "MALARIA" || u === "DENGUE" || u === "TB") return u as Filter;
  return "ALL";
}

/** Derive neighborhood list from raw DB reports */
function deriveNeighborhoods(reports: HeatmapReport[]) {
  const grouped = new Map<string, HeatmapReport[]>();
  reports.forEach((r) => {
    if (!r.neighborhood) return;
    if (!grouped.has(r.neighborhood)) grouped.set(r.neighborhood, []);
    grouped.get(r.neighborhood)!.push(r);
  });

  return Array.from(grouped.entries())
    .slice(0, 6)
    .map(([name, reps], i) => {
      const avg   = reps.reduce((s, r) => s + r.intensity, 0) / reps.length;
      const trend = reps[0].trend ?? (avg > 0.7 ? "Rising" : avg > 0.4 ? "Stable" : "Low Data");
      const color = avg > 0.7 ? "#ba1a1a" : avg > 0.4 ? "#50a14f" : "#5e5e5e";
      const icon  = avg > 0.7 ? "trending_up" : avg > 0.4 ? "trending_flat" : "remove";
      return {
        num:    String(i + 1).padStart(2, "0"),
        name,
        trend,
        icon,
        color,
        filter: toFilter(reps[0].disease_tag),
      };
    });
}

/** Calculate metrics (participants + incidence) from reports for a given filter */
function calcMetrics(filter: Filter, reports: HeatmapReport[]) {
  const filtered =
    filter === "ALL" ? reports : reports.filter((r) => toFilter(r.disease_tag) === filter);
  const count = filtered.length;
  const avg   = count > 0 ? filtered.reduce((s, r) => s + r.intensity, 0) / count : 0;
  const incidence =
    avg > 0.7 ? "HIGH" : avg > 0.4 ? "MEDIUM" : "LOW";
  const incColor =
    incidence === "HIGH" ? "#ba1a1a" : incidence === "MEDIUM" ? "#986801" : "#50a14f";
  return {
    participants: count > 0 ? count.toLocaleString() : "—",
    incidence,
    incColor,
  };
}

function renderMarkers(
  L: typeof import("leaflet"),
  map: LeafletMap,
  filter: Filter,
  ref: React.MutableRefObject<Circle[]>,
  hotspots: Hotspot[],
) {
  ref.current.forEach((c) => c.remove());
  ref.current = [];

  const spots    = filter === "ALL" ? hotspots : hotspots.filter((s) => s.tag === filter);
  const tagColor = filter === "ALL" ? undefined : TAG_COLORS[filter];

  spots.forEach((spot) => {
    const c = tagColor ?? (spot.intensity > 0.7 ? "#ba1a1a" : spot.intensity > 0.4 ? "#986801" : "#50a14f");
    ref.current.push(
      L.circle([spot.lat, spot.lng], {
        color: "transparent", fillColor: c,
        fillOpacity: 0.2 + spot.intensity * 0.3,
        radius: 700 + spot.intensity * 900,
      }).addTo(map),
      L.circle([spot.lat, spot.lng], {
        color: c, fillColor: c, fillOpacity: 0.85, radius: 80, weight: 1,
      }).addTo(map),
    );
  });
}

const GLASS = { background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)" } as const;

// ── Component ────────────────────────────────────────────────────────────────
export default function HeatmapClient() {
  const router          = useRouter();
  const mapRef          = useRef<LeafletMap | null>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const circleLayersRef = useRef<Circle[]>([]);

  const [activeFilter,   setActiveFilter]   = useState<Filter>("ALL");
  const [reports,        setReports]        = useState<HeatmapReport[]>([]);
  const [dbLoaded,       setDbLoaded]       = useState(false);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [showContribute, setShowContribute] = useState(false);

  // ── Load heatmap_reports from Supabase ────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("heatmap_reports")
      .select("*")
      .order("reported_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setReports(data);
          setDbLoaded(true);
        }
        setDataLoading(false);
      });
  }, []);

  // ── Derived state (memoised to avoid re-render loops) ─────────────────────
  const hotspots = useMemo<Hotspot[]>(
    () =>
      dbLoaded
        ? reports.map((r) => ({
            lat:       r.lat,
            lng:       r.lng,
            intensity: r.intensity,
            tag:       toFilter(r.disease_tag),
          }))
        : FALLBACK_HOTSPOTS,
    [dbLoaded, reports],
  );

  const neighborhoods = useMemo(
    () => (dbLoaded ? deriveNeighborhoods(reports) : FALLBACK_NEIGHBORHOODS),
    [dbLoaded, reports],
  );

  const metrics = useMemo(
    () =>
      dbLoaded
        ? calcMetrics(activeFilter, reports)
        : {
            ALL:     { participants: "12,482", incidence: "LOW",    incColor: "#50a14f" },
            MALARIA: { participants: "4,230",  incidence: "MEDIUM", incColor: "#986801" },
            DENGUE:  { participants: "3,910",  incidence: "LOW",    incColor: "#50a14f" },
            TB:      { participants: "2,180",  incidence: "LOW",    incColor: "#50a14f" },
          }[activeFilter],
    [dbLoaded, reports, activeFilter],
  );

  // ── Initialise Leaflet map ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;
    (async () => {
      const L   = await import("leaflet");
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
      renderMarkers(L, map, activeFilter, circleLayersRef, hotspots);
    })();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render markers when filter or data changes ─────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = await import("leaflet");
      renderMarkers(L, mapRef.current!, activeFilter, circleLayersRef, hotspots);
    })();
  }, [activeFilter, hotspots]);

  // ── Filtered neighborhood list ────────────────────────────────────────────
  const visibleNeighborhoods =
    activeFilter === "ALL"
      ? neighborhoods
      : neighborhoods.filter((n) => n.filter === activeFilter || n.filter === "ALL");

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f3f3f4]">

      {/* ── Contribute anonymously modal ─────────────────────────────────── */}
      {showContribute && (
        <div
          className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowContribute(false)}
        >
          <div
            className="bg-white rounded-[40px] p-12 max-w-md mx-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-6">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
            </div>
            <h3 className="font-serif font-medium text-2xl mb-3">Anonymous Contribution</h3>
            <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed mb-6">
              Your symptom report is stripped of all personally identifiable information
              before being added to the community heatmap. Location data is spatially
              blurred to a ±500m radius.
            </p>

            {/* Anonymization pipeline visual */}
            <div className="flex items-center gap-3 mb-8 p-4 bg-[#f3f3f4] rounded-xl">
              {[
                { icon: "person",    label: "Your Data" },
                { icon: "lock",      label: "Anonymize" },
                { icon: "public",    label: "Heatmap"   },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 1 ? "bg-black" : "bg-[#e2e2e2]"}`}>
                      <span
                        className={`material-symbols-outlined ${i === 1 ? "text-white" : "text-black"}`}
                        style={{ fontSize: "14px", fontVariationSettings: i === 1 ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {step.icon}
                      </span>
                    </div>
                    <span className="font-sans text-[9px] font-semibold tracking-widest uppercase text-[#5e5e5e] whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-[#cfc4c5] text-sm mb-4">→</span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setShowContribute(false); router.push("/ai-guidance"); }}
                className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-all active:scale-95"
              >
                Continue to Report Symptoms
              </button>
              <button
                onClick={() => setShowContribute(false)}
                className="w-full py-3 text-[#5e5e5e] font-sans text-xs font-semibold tracking-widest uppercase hover:text-black transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaflet map ───────────────────────────────────────────────────── */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* ── Data loading indicator ────────────────────────────────────────── */}
      {dataLoading && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-[1002] flex items-center gap-2 px-4 py-2 rounded-full border border-[#cfc4c5]"
          style={GLASS}
        >
          <div className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#5e5e5e]">
            Loading map data...
          </span>
        </div>
      )}

      {/* ── Top-left · Info panel ─────────────────────────────────────────── */}
      <div
        className="absolute top-6 left-6 z-[1001] w-64 p-5 rounded-2xl border border-[#cfc4c5]"
        style={GLASS}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${dbLoaded ? "bg-[#50a14f] animate-pulse" : "bg-[#986801]"}`}
          />
          <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e]">
            {dbLoaded ? "Live Monitoring" : "Offline Data"}
          </p>
        </div>
        <h1 className="font-serif text-2xl font-semibold mb-2">Nairobi Activity</h1>
        <p className="font-sans text-xs text-[#4c4546] leading-relaxed">
          {dbLoaded
            ? `${hotspots.length} active report${hotspots.length !== 1 ? "s" : ""} across ${neighborhoods.length} zone${neighborhoods.length !== 1 ? "s" : ""}. All data is end-to-end encrypted and spatially blurred.`
            : "Real-time symptom distribution across your local region. All data is end-to-end encrypted and spatially blurred for absolute privacy."}
        </p>
      </div>

      {/* ── Top-center · Filter pills ─────────────────────────────────────── */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 px-4 py-3 rounded-full border border-[#cfc4c5]"
        style={GLASS}
      >
        {(["ALL", "MALARIA", "DENGUE", "TB"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full font-sans text-[10px] font-semibold tracking-wider uppercase transition-all ${
              activeFilter === f ? "bg-black text-white" : "text-[#1a1c1c] hover:bg-[#e2e2e2]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Top-right · Metrics (live from DB) ───────────────────────────── */}
      <div className="absolute top-6 right-6 z-[1001] flex gap-3">
        <div className="px-5 py-4 rounded-2xl border border-[#cfc4c5]" style={GLASS}>
          <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-1">
            Incidence
          </p>
          <p className="font-serif text-2xl font-semibold" style={{ color: metrics.incColor }}>
            {metrics.incidence}
          </p>
        </div>
        <div className="px-5 py-4 rounded-2xl border border-[#cfc4c5]" style={GLASS}>
          <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-1">
            Reports
          </p>
          <p className="font-serif text-2xl font-semibold">{metrics.participants}</p>
        </div>
      </div>

      {/* ── Right-center · Zoom controls ─────────────────────────────────── */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[1001] flex flex-col gap-1">
        {[
          { label: "+", action: () => mapRef.current?.zoomIn()  },
          { label: "−", action: () => mapRef.current?.zoomOut() },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-9 h-9 rounded-xl border border-[#cfc4c5] flex items-center justify-center font-sans font-semibold text-lg hover:bg-white transition-all"
            style={GLASS}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Bottom-left · Neighborhood trends (live from DB) ─────────────── */}
      <div
        className="absolute bottom-6 left-6 z-[1001] w-72 p-5 rounded-2xl border border-[#cfc4c5]"
        style={GLASS}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e]">
            Neighborhood Trends
          </p>
          <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontSize: "16px" }}>
            trending_up
          </span>
        </div>

        {dataLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 bg-[#e2e2e2] rounded animate-pulse" />
            ))}
          </div>
        ) : visibleNeighborhoods.length === 0 ? (
          <p className="font-sans text-xs text-[#5e5e5e]">No data for this filter.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleNeighborhoods.map((n) => (
              <button
                key={n.name}
                className="flex items-center justify-between py-1.5 w-full text-left hover:opacity-70 transition-opacity"
                onClick={() => setActiveFilter(n.filter === "ALL" ? "ALL" : n.filter)}
              >
                <span className="font-sans text-xs font-medium text-[#1a1c1c]">{n.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-px rounded-full" style={{ background: n.color }} />
                  <span
                    className="font-sans text-[10px] font-semibold tracking-wide whitespace-nowrap"
                    style={{ color: n.color }}
                  >
                    {n.trend}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom-center · Anonymization pipeline + CTA buttons ─────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] flex flex-col items-center gap-3">
        {/* Pipeline visual */}
        <div
          className="flex items-center gap-4 px-6 py-4 rounded-full border border-[#cfc4c5]"
          style={GLASS}
        >
          {[
            { icon: "person",              label: "Identity", filled: false },
            { icon: "lock",                label: "Anonymize", filled: true  },
            { icon: "fiber_manual_record", label: "Map Dot",  filled: false },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                {step.filled ? (
                  <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
                    >
                      {step.icon}
                    </span>
                  </div>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    {step.icon}
                  </span>
                )}
                <span className="font-sans text-[9px] font-semibold tracking-widest uppercase text-[#5e5e5e]">
                  {step.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-[#cfc4c5] text-base leading-none">→</span>
              )}
            </div>
          ))}
        </div>

        {/* CTA buttons — now fully wired */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowContribute(true)}
            className="px-5 py-2.5 rounded-full border border-[#cfc4c5] font-sans text-[10px] font-semibold tracking-widest uppercase hover:bg-white transition-all"
            style={GLASS}
          >
            Contribute Anonymously →
          </button>
          <button
            onClick={() => router.push("/ai-guidance")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white font-sans text-[10px] font-semibold tracking-widest uppercase hover:bg-[#1a1c1c] transition-all"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}
            >
              location_on
            </span>
            Report Symptoms
          </button>
        </div>
      </div>

      {/* ── Bottom-right · Risk scale ─────────────────────────────────────── */}
      <div
        className="absolute bottom-6 right-6 z-[1001] p-4 rounded-2xl border border-[#cfc4c5]"
        style={GLASS}
      >
        <p className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-3">
          Risk Scale
        </p>
        <div className="flex flex-col gap-2">
          {[
            { color: "#ba1a1a", label: "High Risk Area",        pulse: true  },
            { color: "#986801", label: "Moderate Activity",     pulse: false },
            { color: "#50a14f", label: "Stable / Low Activity", pulse: false },
          ].map(({ color, label, pulse }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${pulse ? "animate-pulse" : ""}`}
                style={{ background: color }}
              />
              <span className="font-sans text-[10px] text-[#1a1c1c]">{label}</span>
            </div>
          ))}
        </div>
        {/* Live/Offline badge */}
        <div className="mt-3 pt-3 border-t border-[#e2e2e2] flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${dbLoaded ? "bg-[#50a14f]" : "bg-[#986801]"}`} />
          <span className="font-mono text-[9px] text-[#5e5e5e] uppercase tracking-widest">
            {dbLoaded ? "Live Data" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
