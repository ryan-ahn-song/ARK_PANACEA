"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Circle } from "leaflet";

type Filter = "ALL" | "MALARIA" | "DENGUE" | "TB";

const NEIGHBORHOODS = [
  { num: "01", name: "Upper Hill District", trend: "Rising +12%", icon: "trending_up", color: "#ba1a1a", filter: "MALARIA" as Filter },
  { num: "02", name: "Westlands Core", trend: "Stable", icon: "trending_flat", color: "#50a14f", filter: "ALL" as Filter },
  { num: "03", name: "Kilimani Sector", trend: "Rising +4%", icon: "trending_up", color: "#ba1a1a", filter: "DENGUE" as Filter },
  { num: "04", name: "Karen Enclave", trend: "Falling -8%", icon: "trending_down", color: "#50a14f", filter: "TB" as Filter },
];

type Hotspot = {
  lat: number;
  lng: number;
  intensity: number;
  tag: Filter;
};

const ALL_HOTSPOTS: Hotspot[] = [
  { lat: -1.2921, lng: 36.8219, intensity: 0.9, tag: "MALARIA" },
  { lat: -1.2634, lng: 36.7943, intensity: 0.6, tag: "MALARIA" },
  { lat: -1.3032, lng: 36.8123, intensity: 0.4, tag: "DENGUE" },
  { lat: -1.2100, lng: 36.8850, intensity: 0.75, tag: "DENGUE" },
  { lat: -1.3200, lng: 36.7200, intensity: 0.3, tag: "TB" },
  { lat: -1.2800, lng: 36.7600, intensity: 0.5, tag: "TB" },
  { lat: -1.2450, lng: 36.8600, intensity: 0.65, tag: "MALARIA" },
];

const TAG_COLORS: Record<Filter, string> = {
  ALL: "#000",
  MALARIA: "#50a14f",
  DENGUE: "#986801",
  TB: "#a626a4",
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
      fillOpacity: 0.2 + spot.intensity * 0.3,
      radius: 700 + spot.intensity * 900,
    }).addTo(map);
    const inner = L.circle([spot.lat, spot.lng], {
      color: c,
      fillColor: c,
      fillOpacity: 0.85,
      radius: 80,
      weight: 1,
    }).addTo(map);
    circleLayersRef.current.push(outer, inner);
  });
}

export default function HeatmapClient() {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleLayersRef = useRef<Circle[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    async function initMap() {
      const L = await import("leaflet");

      const map = L.map(containerRef.current!, {
        center: [-1.2921, 36.8219], // Nairobi
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "©OpenStreetMap ©CartoDB",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;

      // 초기 마커 렌더
      renderMarkers(L, map, "ALL", circleLayersRef);
    }

    initMap();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // 필터 변경 시 마커 업데이트
  useEffect(() => {
    if (!mapRef.current) return;
    async function update() {
      const L = await import("leaflet");
      renderMarkers(L, mapRef.current!, activeFilter, circleLayersRef);
    }
    update();
  }, [activeFilter]);

  const filteredNeighborhoods = activeFilter === "ALL"
    ? NEIGHBORHOODS
    : NEIGHBORHOODS.filter((n) => n.filter === activeFilter || n.filter === "ALL");

  const metrics = {
    ALL: { participants: "12,408", symptoms: "842" },
    MALARIA: { participants: "4,230", symptoms: "318" },
    DENGUE: { participants: "3,910", symptoms: "276" },
    TB: { participants: "2,180", symptoms: "134" },
  };
  const m = metrics[activeFilter];

  return (
    <div className="min-h-screen bg-[#f9f9f9] overflow-x-hidden">
      <main className="relative">

        {/* ── Hero Section ── */}
        <section className="max-w-[1200px] mx-auto px-16 pt-40 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-end">
            <div className="md:col-span-3">
              <div className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-4">
                Community Intelligence
              </div>
              <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight mb-6">
                Real-time Biosurveillance
              </h1>
              <p className="font-sans text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-[#4c4546] max-w-2xl">
                Visualizing anonymized health trends across the city to predict outbreaks before they accelerate.
              </p>
            </div>
            <div className="md:col-span-2 text-right">
              <div className="inline-flex flex-col items-end">
                <div className="font-mono text-xs text-[#5e5e5e] mb-1">DATA_STREAM_ACTIVE</div>
                <div className="h-px w-24 bg-black mb-4" />
                <div className="font-serif font-medium text-2xl">v.1.04-Alpha</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Integrated Map Section ── */}
        <section className="max-w-[1200px] mx-auto px-16 mb-32 relative">
          <div className="w-full h-[600px] rounded-xl overflow-hidden relative border border-[#cfc4c5] bg-[#f3f3f4]">

            {/* Filter overlay */}
            <div className="absolute top-8 left-8 z-10 flex flex-col gap-4">
              {/* Filter pills */}
              <div className="p-6 rounded-xl flex flex-col gap-4 w-64 border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)" }}>
                <div className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e]">Active Filters</div>
                <div className="flex flex-wrap gap-2">
                  {(["ALL", "MALARIA", "DENGUE", "TB"] as Filter[]).map((f) => (
                    <button key={f} onClick={() => setActiveFilter(f)}
                      className={`px-4 py-2 rounded-full font-sans text-[10px] font-semibold tracking-wider uppercase transition-all ${
                        activeFilter === f ? "bg-black text-white" : "border border-[#7e7576] text-[#1a1c1c] hover:bg-[#e2e2e2]"
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics — filtered */}
              <div className="p-6 rounded-xl flex flex-col gap-4 w-64 border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)" }}>
                <div className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e]">Impact Metrics</div>
                <div>
                  <div className="font-serif font-medium text-2xl">{m.participants}</div>
                  <div className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">Active Participants</div>
                </div>
                <div className="h-px bg-[#cfc4c5] w-full" />
                <div>
                  <div className="font-serif font-medium text-2xl">{m.symptoms}</div>
                  <div className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">Reported Symptoms</div>
                </div>
              </div>
            </div>

            {/* Leaflet map */}
            <div ref={containerRef} className="w-full h-full" />

            {/* Legend */}
            <div className="absolute bottom-8 right-8 z-10 p-4 rounded-xl flex items-center gap-6 border border-[#cfc4c5]"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)" }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ba1a1a] animate-pulse" />
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#50a14f]" />
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase">Low Risk</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Anonymization Flow ── */}
        <section className="bg-[#f3f3f4] py-32 border-t border-[#cfc4c5] overflow-hidden relative">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: "#000", filter: "blur(40px)", opacity: 0.04 }} />
          <div className="max-w-[1200px] mx-auto px-16 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-4">Privacy Engineering</div>
                <h2 className="font-serif text-[42px] font-light leading-[1.3] mb-8">Anonymous Mapping Model</h2>
                <p className="font-sans text-base text-[#4c4546] mb-12 max-w-md leading-relaxed">
                  Demo reports are shown as neighborhood-level clusters. Production data should be aggregated before it becomes a community heatmap.
                </p>
              </div>

              <div className="flex items-center justify-between p-12 rounded-full border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)" }}>
                {[
                  { icon: "person", label: "Patient", filled: false },
                  { icon: "lock", label: "Hashing", filled: true },
                  { icon: "grain", label: "Cluster", filled: false },
                ].map((step) => (
                  <div key={step.label} className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${step.filled ? "bg-black" : "border border-[#cfc4c5]"}`}>
                      <span className={`material-symbols-outlined ${step.filled ? "text-white" : "text-black"}`}
                        style={step.filled ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {step.icon}
                      </span>
                    </div>
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Neighborhood Velocity ── */}
        <section className="max-w-[1200px] mx-auto px-16 py-32">
          <div className="flex justify-between items-end mb-16">
            <div>
              <div className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] mb-4">Regional Breakdown</div>
              <h2 className="font-serif text-[42px] font-light leading-[1.3]">Neighborhood Velocity</h2>
            </div>
            <div className="font-mono text-xs text-[#5e5e5e]">
              {activeFilter !== "ALL" ? `FILTER: ${activeFilter}` : "ALL PATHOGENS"}
            </div>
          </div>

          <div className="flex flex-col">
            {(activeFilter === "ALL" ? NEIGHBORHOODS : filteredNeighborhoods).map((n, i, arr) => (
              <div key={n.name}
                className={`group relative border-t border-[#cfc4c5] py-10 cursor-pointer ${i === arr.length - 1 ? "border-b" : ""}`}
                onClick={() => setActiveFilter(n.filter === "ALL" ? "ALL" : n.filter)}>
                <div className="absolute top-0 left-0 h-0.5 bg-black w-1/3 group-hover:w-full transition-all duration-500 ease-out" />
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-1 font-mono text-xs text-[#5e5e5e]">{n.num}</div>
                  <div className="md:col-span-5 font-serif font-medium text-2xl">{n.name}</div>
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2" style={{ color: n.color }}>
                      <span className="material-symbols-outlined">{n.icon}</span>
                      <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">{n.trend}</span>
                    </div>
                  </div>
                  <div className="md:col-span-3 text-right">
                    <button className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] group-hover:text-black transition-colors">
                      Filter on Map →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-32 bg-white border-t border-[#cfc4c5]">
        <div className="max-w-[1200px] mx-auto px-16 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-serif font-medium text-2xl text-black">PANACEA</div>
          <div className="flex flex-wrap justify-center gap-8">
            {["Privacy Policy", "Terms of Service", "Research Papers", "Contact"].map((l) => (
              <a key={l} href="#" className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors">{l}</a>
            ))}
          </div>
          <div className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e]">
            © 2025 PANACEA INFECTIOUS DISEASE INSTITUTE.
          </div>
        </div>
      </footer>
    </div>
  );
}
