"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────
type Side = "front" | "back";
type ZoneEntry    = { zone: string; intensity: number };
type SymptomEntry = { icon: string; label: string };

interface DiseaseData {
  id: string;
  label: string;
  color: string;
  num: string;
  desc: string;
  zones: ZoneEntry[];
  symptoms: SymptomEntry[];
}

// ── Zone normalisation ───────────────────────────────────────────────────────
// DB sends simple strings; this maps them to canonical body-atlas zone IDs
const ZONE_ALIAS: Record<string, string> = {
  abdomen:  "abdomen",
  throat:   "chest",     // throat → upper chest
  legs:     "joints",    // legs → knee joints
  skin:     "skin",      // full-body overlay
  lymph:    "chest",
};

const ZONE_INTENSITY: Record<string, number> = {
  head: 0.85, chest: 0.80, lungs: 0.88, liver: 0.75,
  abdomen: 0.80, joints: 0.90, spine: 0.78, shoulders: 0.65, skin: 0.45,
};

// ── Symptom normalisation ────────────────────────────────────────────────────
// DB sends plain strings; map to Material Symbols icon + display label
const SYMPTOM_ICON_MAP: Record<string, SymptomEntry> = {
  "fever":        { icon: "thermostat",     label: "Fever" },
  "cough":        { icon: "air",            label: "Cough" },
  "headache":     { icon: "psychology",     label: "Headache" },
  "fatigue":      { icon: "bed",            label: "Fatigue" },
  "chills":       { icon: "ac_unit",        label: "Chills" },
  "sweating":     { icon: "water_drop",     label: "Sweating" },
  "nausea":       { icon: "sick",           label: "Nausea" },
  "sore throat":  { icon: "air",            label: "Sore Throat" },
  "body aches":   { icon: "accessibility",  label: "Body Aches" },
  "joint pain":   { icon: "hive",           label: "Joint Pain" },
  "rash":         { icon: "coronavirus",    label: "Rash" },
  "eye pain":     { icon: "visibility_off", label: "Eye Pain" },
  "night sweats": { icon: "bedtime",        label: "Night Sweats" },
  "weight loss":  { icon: "monitor_weight", label: "Weight Loss" },
  "chest pain":   { icon: "favorite",       label: "Chest Pain" },
  "high fever":   { icon: "thermostat",     label: "High Fever" },
  "low fever":    { icon: "thermostat",     label: "Low Fever" },
  "chronic cough":{ icon: "air",            label: "Chronic Cough" },
};

/** Parse DB affected_zones — handles both string[] and ZoneEntry[] */
function parseZones(raw: unknown): ZoneEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ZoneEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const canonical = ZONE_ALIAS[item.toLowerCase()] ?? item.toLowerCase();
      if (!seen.has(canonical)) {
        seen.add(canonical);
        out.push({ zone: canonical, intensity: ZONE_INTENSITY[canonical] ?? 0.65 });
      }
    } else if (typeof item === "object" && item !== null && "zone" in item && "intensity" in item) {
      const ze = item as ZoneEntry;
      if (!seen.has(ze.zone)) { seen.add(ze.zone); out.push(ze); }
    }
  }
  return out;
}

/** Parse DB symptom_clusters — handles both string[] and SymptomEntry[] */
function parseSymptoms(raw: unknown): SymptomEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => typeof item === "string" || (typeof item === "object" && item !== null && "icon" in item))
    .map((item) => {
      if (typeof item === "string") {
        return SYMPTOM_ICON_MAP[item.toLowerCase()] ?? { icon: "medical_information", label: item };
      }
      return item as SymptomEntry;
    });
}

// ── Fallback (used while DB loads or if table empty) ─────────────────────────
const FALLBACK: DiseaseData[] = [
  {
    id: "malaria", label: "Malaria", color: "#986801", num: "01",
    desc: "Parasitic infection transmitted by Anopheles mosquitoes.",
    zones: [
      { zone: "head",    intensity: 0.85 },
      { zone: "abdomen", intensity: 0.80 },
      { zone: "joints",  intensity: 0.65 },
    ],
    symptoms: [
      { icon: "thermostat", label: "Fever" },
      { icon: "ac_unit",    label: "Chills" },
      { icon: "psychology", label: "Headache" },
      { icon: "bed",        label: "Fatigue" },
    ],
  },
  {
    id: "influenza", label: "Influenza", color: "#ba1a1a", num: "02",
    desc: "Contagious respiratory illness caused by influenza viruses.",
    zones: [
      { zone: "head",  intensity: 0.90 },
      { zone: "chest", intensity: 0.80 },
    ],
    symptoms: [
      { icon: "air",        label: "Cough" },
      { icon: "thermostat", label: "Fever" },
      { icon: "psychology", label: "Headache" },
      { icon: "bed",        label: "Fatigue" },
    ],
  },
  {
    id: "dengue", label: "Dengue", color: "#c85e17", num: "03",
    desc: "Mosquito-borne viral infection causing severe flu-like illness.",
    zones: [
      { zone: "head",    intensity: 0.80 },
      { zone: "abdomen", intensity: 0.75 },
      { zone: "joints",  intensity: 0.95 },
      { zone: "skin",    intensity: 0.50 },
    ],
    symptoms: [
      { icon: "thermostat",    label: "High Fever" },
      { icon: "psychology",    label: "Eye Pain" },
      { icon: "hive",          label: "Joint Pain" },
      { icon: "coronavirus",   label: "Rash" },
    ],
  },
  {
    id: "tuberculosis", label: "Tuberculosis", color: "#5e5e5e", num: "04",
    desc: "Infectious airborne disease caused by Mycobacterium tuberculosis.",
    zones: [
      { zone: "chest", intensity: 0.85 },
      { zone: "lungs", intensity: 0.95 },
    ],
    symptoms: [
      { icon: "air",           label: "Chronic Cough" },
      { icon: "bedtime",       label: "Night Sweats" },
      { icon: "monitor_weight",label: "Weight Loss" },
      { icon: "thermostat",    label: "Low Fever" },
    ],
  },
];

const ALL_ZONES = ["head", "chest", "lungs", "liver", "abdomen", "joints", "spine", "shoulders", "skin"];

// ── Progression stages ───────────────────────────────────────────────────────
type SeverityLevel = "low" | "medium" | "high";
const STAGES: Record<string, { day: string; stage: string; severity: SeverityLevel }[]> = {
  malaria: [
    { day: "Day 1–3",  stage: "Incubation · Parasite multiplies in liver",  severity: "low" },
    { day: "Day 4–7",  stage: "Fever cycles · Chills · Sweating attacks",   severity: "medium" },
    { day: "Day 8–14", stage: "Acute phase · Severe anaemia risk",           severity: "high" },
    { day: "Day 14+",  stage: "Recovery with antimalarial treatment",        severity: "low" },
  ],
  influenza: [
    { day: "Day 1–2",  stage: "Incubation · Contagious period begins",      severity: "low" },
    { day: "Day 2–4",  stage: "Acute onset · Fever + body aches",           severity: "high" },
    { day: "Day 4–7",  stage: "Peak symptoms · Respiratory distress",       severity: "high" },
    { day: "Day 7–14", stage: "Gradual recovery · Rest essential",          severity: "low" },
  ],
  dengue: [
    { day: "Day 1–3",  stage: "Febrile phase · Sudden high fever",         severity: "high" },
    { day: "Day 4–5",  stage: "Critical phase · Plasma leakage risk",      severity: "high" },
    { day: "Day 6–7",  stage: "Recovery · Fluid reabsorption",             severity: "medium" },
    { day: "Day 7–10", stage: "Full recovery with monitoring",             severity: "low" },
  ],
  tuberculosis: [
    { day: "Weeks 1–4",    stage: "Latent infection · No symptoms",         severity: "low" },
    { day: "Month 1–3",    stage: "Active onset · Persistent cough",        severity: "medium" },
    { day: "Month 3–6",    stage: "Progressive · Weight loss · Night sweats",severity: "high" },
    { day: "Treatment",    stage: "6-month antibiotic course required",     severity: "low" },
  ],
};

function getStages(label: string) {
  const key = label.toLowerCase().replace("tuberculosis", "tuberculosis").replace(/\s+/g, "_");
  return STAGES[key] ?? STAGES[label.toLowerCase()] ?? STAGES["influenza"] ?? [];
}

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  low:    "#50a14f",
  medium: "#986801",
  high:   "#ba1a1a",
};

// ── Component ────────────────────────────────────────────────────────────────
export default function BodyAtlasPage() {
  const router = useRouter();
  const [diseases, setDiseases]     = useState<DiseaseData[]>(FALLBACK);
  const [selectedId, setSelectedId] = useState<string>(FALLBACK[0].id);
  const [side, setSide]             = useState<Side>("front");
  const [dbLoaded, setDbLoaded]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // Load pathologies from Supabase
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("pathologies")
        .select("*")
        .order("created_at");

      if (!error && data && data.length > 0) {
        const transformed: DiseaseData[] = data.map((p, i) => ({
          id:       p.id,
          label:    p.name,
          color:    p.color ?? "#5e5e5e",
          num:      String(i + 1).padStart(2, "0"),
          desc:     p.description ?? "",
          zones:    parseZones(p.affected_zones),
          symptoms: parseSymptoms(p.symptom_clusters),
        }));
        setDiseases(transformed);
        setSelectedId(transformed[0].id);
        setDbLoaded(true);
      }
      setLoading(false);
    }
    load();
  }, []);

  const sel = diseases.find((d) => d.id === selectedId) ?? diseases[0];

  const isZoneActive   = (z: string) => sel?.zones.some((e) => e.zone === z) ?? false;
  const zoneIntensity  = (z: string) => sel?.zones.find((e) => e.zone === z)?.intensity ?? 0;
  const zoneCoverage   = sel ? Math.round(
    (sel.zones.filter((z) => ALL_ZONES.includes(z.zone)).length / ALL_ZONES.length) * 100,
  ) : 0;

  function goToAI() {
    const param = sel ? `?disease=${encodeURIComponent(sel.label.toLowerCase())}` : "";
    router.push(`/ai-guidance${param}`);
  }

  const stages = getStages(sel?.label ?? "");

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <main className="pt-20 min-h-screen flex flex-col items-center">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="w-full max-w-[1200px] px-16 py-16 text-center">
          <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">
            Diagnostic Visualisation
          </span>
          <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight mb-6">
            The Human Body Atlas
          </h1>
          <p className="max-w-2xl mx-auto font-sans text-base text-[#4c4546] leading-relaxed">
            Select a pathology to visualise its physiological footprint across the human anatomy,
            then run an AI symptom analysis with one click.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-[#986801] animate-pulse" : dbLoaded ? "bg-[#50a14f]" : "bg-[#986801]"}`} />
            <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">
              {loading
                ? "Loading atlas data…"
                : dbLoaded
                  ? `${diseases.length} pathologies loaded from database`
                  : `${diseases.length} pathologies (demo data)`}
            </span>
          </div>
        </section>

        {/* ── Main 3-column stage ───────────────────────────────────────── */}
        <section className="w-full max-w-[1200px] px-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start pb-32">

          {/* LEFT — Disease list */}
          <aside className="md:col-span-3 flex flex-col gap-6 sticky top-32">
            <div className="space-y-0">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-t border-[#cfc4c5] pt-6 pb-6 animate-pulse">
                      <div className="h-3 w-8 bg-[#e2e2e2] rounded mb-3" />
                      <div className="h-6 w-24 bg-[#e2e2e2] rounded" />
                    </div>
                  ))
                : diseases.map((d) => (
                    <button key={d.id} onClick={() => { setSelectedId(d.id); setSide("front"); }}
                      className="w-full text-left border-t border-[#cfc4c5] pt-6 pb-6 transition-all duration-300 hover:opacity-80 active:scale-95 group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-sans text-[10px] font-semibold tracking-[0.2em] text-[#5e5e5e]">{d.num}</span>
                        <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-150" style={{ background: d.color }} />
                      </div>
                      <h3 className="font-serif font-medium text-2xl mb-1">{d.label}</h3>
                      {selectedId === d.id && (
                        <p className="font-sans text-xs text-[#5e5e5e] mb-2 leading-relaxed">{d.desc}</p>
                      )}
                      <div className="h-0.5 rounded-full transition-all duration-500 origin-left"
                        style={{ background: d.color, width: selectedId === d.id ? "100%" : "0%" }} />
                    </button>
                  ))}
            </div>

            {/* CTA */}
            <button onClick={goToAI}
              className="mt-4 flex items-center justify-between p-6 bg-[#eeeeee] rounded-xl border border-[#cfc4c5] hover:bg-black hover:text-white hover:border-black transition-all group">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">compare_arrows</span>
                <div className="text-left">
                  <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase block">Symptom Analysis</span>
                  <p className="font-sans text-[10px] uppercase tracking-wider mt-1 opacity-60">
                    {sel ? `Run AI for ${sel.label} →` : "Run AI guidance →"}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </aside>

          {/* CENTER — Body SVG */}
          <div className="md:col-span-6 flex flex-col items-center justify-center relative min-h-[700px]">
            {/* Front / Back toggle */}
            <div className="flex gap-1 mb-8 bg-[#e8e8e8] p-1.5 rounded-full border border-[#cfc4c5] w-fit mx-auto">
              {(["front", "back"] as Side[]).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  className={`px-8 py-2 rounded-full font-sans text-xs font-semibold tracking-widest uppercase transition-all ${
                    side === s ? "bg-black text-white shadow-md" : "text-[#5e5e5e] hover:text-black"
                  }`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Zone label tooltip */}
            {hoveredZone && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-black text-white px-4 py-2 rounded-full font-sans text-[10px] font-semibold tracking-widest uppercase pointer-events-none transition-all">
                {hoveredZone.replace(/_/g, " ")}
              </div>
            )}

            <div className="w-full flex items-center justify-center" style={{ height: 600, perspective: 1200 }}>
              <div
                className="relative w-72 h-[550px]"
                style={{
                  transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
                  transform: side === "back" ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Body silhouette SVG */}
                <svg
                  className="w-full h-full absolute inset-0 text-[#4c4546] opacity-15"
                  fill="currentColor" viewBox="0 0 200 500"
                >
                  {/* Head */}
                  <ellipse cx="100" cy="42" rx="22" ry="26" />
                  {/* Neck */}
                  <rect x="91" y="64" width="18" height="16" rx="4" />
                  {/* Torso */}
                  <path d="M70,80 C60,82 50,90 48,110 L44,220 C43,230 52,235 60,230 L64,200 L136,200 L140,230 C148,235 157,230 156,220 L152,110 C150,90 140,82 130,80 Z" />
                  {/* Left arm */}
                  <path d="M70,85 L52,85 C44,86 40,92 40,100 L38,190 C37,198 42,204 48,202 L60,165 L64,200" />
                  {/* Right arm */}
                  <path d="M130,85 L148,85 C156,86 160,92 160,100 L162,190 C163,198 158,204 152,202 L140,165 L136,200" />
                  {/* Left leg */}
                  <path d="M80,200 L72,340 L68,440 C67,455 75,460 82,455 L90,440 L90,320 Z" />
                  {/* Right leg */}
                  <path d="M120,200 L128,340 L132,440 C133,455 125,460 118,455 L110,440 L110,320 Z" />
                </svg>

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  </div>
                )}

                {/* ── FRONT VIEW ZONES ─── */}
                {!loading && side === "front" && (
                  <>
                    {/* Head */}
                    <Zone id="head" active={isZoneActive("head")} intensity={zoneIntensity("head")} color={sel?.color}
                      className="absolute top-[14px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full"
                      onHover={setHoveredZone} />

                    {/* Chest */}
                    <Zone id="chest" active={isZoneActive("chest")} intensity={zoneIntensity("chest")} color={sel?.color}
                      className="absolute top-[108px] left-1/2 -translate-x-1/2 w-24 h-28 rounded-[40%]"
                      onHover={setHoveredZone} />

                    {/* Lungs — inside chest, slightly smaller */}
                    <Zone id="lungs" active={isZoneActive("lungs")} intensity={zoneIntensity("lungs")} color={sel?.color}
                      className="absolute top-[112px] left-1/2 -translate-x-1/2 w-20 h-20 rounded-[50%]"
                      onHover={setHoveredZone} />

                    {/* Liver — upper right abdomen */}
                    <Zone id="liver" active={isZoneActive("liver")} intensity={zoneIntensity("liver")} color={sel?.color}
                      className="absolute top-[158px] left-[58%] w-10 h-10 rounded-full"
                      onHover={setHoveredZone} />

                    {/* Abdomen — centre below chest */}
                    <Zone id="abdomen" active={isZoneActive("abdomen")} intensity={zoneIntensity("abdomen")} color={sel?.color}
                      className="absolute top-[180px] left-1/2 -translate-x-1/2 w-20 h-16 rounded-[40%]"
                      onHover={setHoveredZone} />

                    {/* Skin overlay — subtle full-torso tint */}
                    <Zone id="skin" active={isZoneActive("skin")} intensity={zoneIntensity("skin")} color={sel?.color}
                      className="absolute top-[80px] left-1/2 -translate-x-1/2 w-32 h-64 rounded-[30%]"
                      onHover={setHoveredZone} />

                    {/* Left knee */}
                    <Zone id="joints" active={isZoneActive("joints")} intensity={zoneIntensity("joints")} color={sel?.color}
                      className="absolute top-[310px] left-[33%] w-7 h-7 rounded-full"
                      onHover={setHoveredZone} />
                    {/* Right knee */}
                    <Zone id="joints-r" active={isZoneActive("joints")} intensity={zoneIntensity("joints")} color={sel?.color}
                      className="absolute top-[310px] right-[33%] w-7 h-7 rounded-full"
                      onHover={setHoveredZone} />
                  </>
                )}

                {/* ── BACK VIEW ZONES ─── */}
                {!loading && side === "back" && (
                  <>
                    {/* Back of head */}
                    <Zone id="head" active={isZoneActive("head")} intensity={zoneIntensity("head")} color={sel?.color}
                      className="absolute top-[14px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full"
                      onHover={setHoveredZone} />

                    {/* Spine */}
                    <Zone id="spine" active={isZoneActive("spine")} intensity={zoneIntensity("spine")} color={sel?.color}
                      className="absolute top-[100px] left-1/2 -translate-x-1/2 w-5 h-72 rounded-full"
                      onHover={setHoveredZone} />

                    {/* Shoulders / upper back */}
                    <Zone id="shoulders" active={isZoneActive("shoulders")} intensity={zoneIntensity("shoulders")} color={sel?.color}
                      className="absolute top-[88px] left-1/2 -translate-x-1/2 w-36 h-12 rounded-[40%]"
                      onHover={setHoveredZone} />

                    {/* Lungs (back) */}
                    <Zone id="lungs" active={isZoneActive("lungs")} intensity={zoneIntensity("lungs")} color={sel?.color}
                      className="absolute top-[110px] left-1/2 -translate-x-1/2 w-24 h-24 rounded-[50%]"
                      onHover={setHoveredZone} />

                    {/* Left knee back */}
                    <Zone id="joints" active={isZoneActive("joints")} intensity={zoneIntensity("joints")} color={sel?.color}
                      className="absolute top-[310px] left-[33%] w-7 h-7 rounded-full"
                      onHover={setHoveredZone} />
                    {/* Right knee back */}
                    <Zone id="joints-r" active={isZoneActive("joints")} intensity={zoneIntensity("joints")} color={sel?.color}
                      className="absolute top-[310px] right-[33%] w-7 h-7 rounded-full"
                      onHover={setHoveredZone} />
                  </>
                )}
              </div>
            </div>

            {/* Active zone label legend */}
            {!loading && sel && sel.zones.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-sm">
                {sel.zones.map((z) => (
                  <span key={z.zone}
                    className="font-mono text-[9px] px-2 py-1 rounded-full border uppercase tracking-wider"
                    style={{
                      borderColor: sel.color,
                      color: sel.color,
                      background: `${sel.color}12`,
                    }}>
                    {z.zone.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Disease detail panel */}
          <div className="md:col-span-3 flex flex-col gap-6 sticky top-32">

            {/* Active badge */}
            {loading
              ? <div className="animate-pulse h-12 bg-[#e2e2e2] rounded-xl" />
              : (
                <div className="flex gap-3 items-center p-4 rounded-xl border border-[#cfc4c5] bg-white">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
                    style={{ background: sel?.color }} />
                  <div>
                    <span className="font-sans text-xs font-semibold tracking-wider uppercase block">{sel?.label}</span>
                    <span className="font-mono text-[9px] text-[#5e5e5e] uppercase tracking-widest">Active Pathology</span>
                  </div>
                </div>
              )}

            {/* Stats grid */}
            {!loading && sel && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-[#cfc4c5] bg-white flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">Zones</span>
                  <span className="font-serif text-2xl font-medium">{sel.zones.length}</span>
                  <span className="font-mono text-[9px] text-[#5e5e5e]">affected</span>
                </div>
                <div className="p-4 rounded-xl border border-[#cfc4c5] bg-white flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">Coverage</span>
                  <span className="font-serif text-2xl font-medium">{zoneCoverage}%</span>
                  <span className="font-mono text-[9px] text-[#5e5e5e]">of atlas</span>
                </div>
              </div>
            )}

            {/* Symptom clusters */}
            <div>
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">
                Key Symptoms
              </span>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse h-20 bg-[#e2e2e2] rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(sel?.symptoms ?? []).map((s) => (
                    <div key={s.label}
                      className="p-4 rounded-xl border border-black bg-black text-white flex flex-col items-center gap-2 hover:bg-[#1b1b1b] transition-colors cursor-default">
                      <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                      <span className="font-sans text-[9px] font-semibold tracking-wider uppercase text-center leading-tight">{s.label}</span>
                    </div>
                  ))}
                  {sel?.symptoms.length === 0 && (
                    <div className="col-span-2 py-6 text-center border border-dashed border-[#cfc4c5] rounded-xl">
                      <p className="font-sans text-[10px] text-[#5e5e5e] uppercase tracking-widest">No symptom data</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Analysis CTA */}
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={goToAI}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80" alt="AI guidance"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-700"
                style={{ filter: "grayscale(1) brightness(0.35)" }} />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 block mb-1">AI Analysis</span>
                <p className="font-serif text-white text-base font-medium leading-tight">
                  {sel ? `Check ${sel.label} symptoms →` : "Check your symptoms →"}
                </p>
                {sel && sel.symptoms.length > 0 && (
                  <p className="font-mono text-[9px] text-white/50 mt-1 uppercase tracking-widest">
                    {sel.symptoms.slice(0, 3).map((s) => s.label).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Disease Progression Timeline ─────────────────────────────── */}
        {!loading && stages.length > 0 && (
          <section className="w-full max-w-[1200px] px-16 pb-24">
            <div className="border-t border-[#cfc4c5] pt-16">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-2">
                    Disease Progression
                  </span>
                  <h2 className="font-serif text-[32px] font-light leading-[1.3]">
                    {sel?.label} Timeline
                  </h2>
                </div>
                <button onClick={goToAI}
                  className="hidden md:flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">biotech</span>
                  Analyse My Symptoms
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {stages.map((stage, i) => (
                  <div key={i}
                    className="p-6 rounded-xl border border-[#cfc4c5] bg-white relative overflow-hidden group hover:shadow-sm transition-shadow">
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ background: SEVERITY_COLOR[stage.severity] }}
                    />
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#5e5e5e]">Stage {i + 1}</span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: SEVERITY_COLOR[stage.severity] }}
                      />
                    </div>
                    <p className="font-sans text-[10px] font-semibold tracking-wider uppercase text-[#5e5e5e] mb-2">{stage.day}</p>
                    <p className="font-sans text-sm text-[#1a1c1c] leading-relaxed">{stage.stage}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Pathological Flow + System Status ────────────────────────── */}
        <section className="w-full bg-[#f3f3f4] py-32">
          <div className="max-w-[1200px] mx-auto px-16 flex flex-col md:flex-row gap-8 items-start">

            <div className="w-full md:w-3/5">
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">
                Evolution
              </span>
              <h2 className="font-serif text-[42px] font-light leading-[1.3] mb-12">Pathological Flow</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {[
                  {
                    icon: "blur_on",
                    title: "Cellular Disruption",
                    desc: "Cellular disruption patterns mapped via real-time satellite health data and clinical observation protocols.",
                  },
                  {
                    icon: "waves",
                    title: "Epidemiological Waves",
                    desc: "Epidemiological waves visualised through anatomical heat gradients and joint-stress indicators.",
                  },
                ].map((item) => (
                  <div key={item.title} className="p-8 bg-white rounded-2xl border border-[#cfc4c5]">
                    <span className="material-symbols-outlined text-black mb-4 block">{item.icon}</span>
                    <h3 className="font-serif font-medium text-lg mb-3">{item.title}</h3>
                    <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="w-full md:w-2/5">
              <div className="bg-black text-white p-8 rounded-2xl">
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50 block mb-6">
                  System Status
                </span>

                {loading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-16 w-24 bg-white/10 rounded" />
                    <div className="h-3 w-40 bg-white/10 rounded" />
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-end gap-2">
                      <span className="font-serif font-semibold text-[64px] leading-none">
                        {String(diseases.length).padStart(2, "0")}
                      </span>
                      <span className="font-serif text-2xl text-white/60 mb-3">/{FALLBACK.length}</span>
                    </div>
                    <p className="font-sans text-xs text-white/60 uppercase tracking-wider mb-1">
                      Pathologies Tracked
                    </p>
                    <p className="font-sans text-[10px] text-white/40 uppercase tracking-widest mb-6">
                      {dbLoaded ? "Live · Database" : "Demo Data"}
                    </p>

                    <div className="space-y-3 mb-8">
                      {diseases.map((d) => (
                        <button key={d.id}
                          onClick={() => { setSelectedId(d.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className="w-full flex items-center justify-between hover:opacity-70 transition-opacity text-left">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="font-sans text-xs text-white/70">{d.label}</span>
                          </div>
                          <span className="font-mono text-[10px] text-white/40">
                            {d.zones.length} zone{d.zones.length !== 1 ? "s" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button onClick={goToAI}
                  className="w-full py-3 rounded-full border border-white/30 text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-white hover:text-black transition-all">
                  Run AI Symptom Analysis →
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Zone bubble component ────────────────────────────────────────────────────
function Zone({
  id, active, intensity, color, className, onHover,
}: {
  id: string; active: boolean; intensity: number; color?: string;
  className: string; onHover: (zone: string | null) => void;
}) {
  const c = color ?? "#5e5e5e";
  return (
    <div
      className={`${className} transition-all duration-700 cursor-default`}
      onMouseEnter={() => active && onHover(id.replace("-r", ""))}
      onMouseLeave={() => onHover(null)}
      style={{
        background: active ? c : "transparent",
        opacity:    active ? 0.15 + intensity * 0.65 : 0,
        filter:     active ? `blur(${Math.max(2, 10 - intensity * 8)}px)` : "blur(12px)",
        border:     active ? `2px solid ${c}` : "none",
        boxShadow:  active ? `0 0 ${Math.round(intensity * 24)}px ${c}40` : "none",
      }}
    />
  );
}
