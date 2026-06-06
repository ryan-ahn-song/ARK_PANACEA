"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

// Fallback used while the DB loads or if pathologies table is empty
const FALLBACK: DiseaseData[] = [
  {
    id: "malaria",
    label: "Malaria",
    color: "#50a14f",
    num: "01",
    desc: "Parasitic infection affecting liver and red blood cells",
    zones: [{ zone: "liver", intensity: 0.9 }, { zone: "head", intensity: 0.6 }, { zone: "joints", intensity: 0.4 }],
    symptoms: [{ icon: "thermostat", label: "High Fever" }, { icon: "sick", label: "Chills" }, { icon: "psychology", label: "Headache" }, { icon: "bed", label: "Fatigue" }],
  },
  {
    id: "influenza",
    label: "Influenza",
    color: "#4078f2",
    num: "02",
    desc: "Respiratory viral infection targeting lungs and airways",
    zones: [{ zone: "chest", intensity: 0.85 }, { zone: "head", intensity: 0.9 }, { zone: "lungs", intensity: 0.8 }],
    symptoms: [{ icon: "air", label: "Cough" }, { icon: "thermostat", label: "Fever" }, { icon: "psychology", label: "Headache" }, { icon: "sick", label: "Sore Throat" }],
  },
  {
    id: "dengue",
    label: "Dengue",
    color: "#986801",
    num: "03",
    desc: "Mosquito-borne virus causing joint pain and fever",
    zones: [{ zone: "joints", intensity: 0.95 }, { zone: "head", intensity: 0.7 }, { zone: "chest", intensity: 0.5 }],
    symptoms: [{ icon: "sick", label: "Joint Pain" }, { icon: "thermostat", label: "High Fever" }, { icon: "psychology", label: "Eye Pain" }, { icon: "sick", label: "Rash" }],
  },
  {
    id: "tb",
    label: "TB",
    color: "#a626a4",
    num: "04",
    desc: "Bacterial infection primarily affecting the lungs",
    zones: [{ zone: "lungs", intensity: 1.0 }, { zone: "chest", intensity: 0.8 }, { zone: "spine", intensity: 0.3 }],
    symptoms: [{ icon: "air", label: "Chronic Cough" }, { icon: "sick", label: "Night Sweats" }, { icon: "bed", label: "Weight Loss" }, { icon: "thermostat", label: "Low Fever" }],
  },
];

// All anatomical zones the atlas can display (used for coverage calculation)
const ALL_ZONES = ["head", "chest", "lungs", "liver", "joints", "spine", "shoulders"];

export default function BodyAtlasPage() {
  const [diseases, setDiseases]       = useState<DiseaseData[]>([]);
  const [selectedId, setSelectedId]   = useState<string>("");
  const [side, setSide]               = useState<Side>("front");
  const [dbLoaded, setDbLoaded]       = useState(false); // true = data came from DB (not fallback)
  const [loading, setLoading]         = useState(true);
  const router = useRouter();

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
          id: p.id,
          label: p.name,
          color: p.color ?? "#5e5e5e",
          num: String(i + 1).padStart(2, "0"),
          desc: p.description ?? "",
          zones: isZoneArray(p.affected_zones) ? (p.affected_zones as ZoneEntry[]) : [],
          symptoms: isSymptomArray(p.symptom_clusters) ? (p.symptom_clusters as SymptomEntry[]) : [],
        }));
        setDiseases(transformed);
        setSelectedId(transformed[0].id);
        setDbLoaded(true);
      } else {
        // Use fallback so the page is never empty
        setDiseases(FALLBACK);
        setSelectedId(FALLBACK[0].id);
        setDbLoaded(false);
      }
      setLoading(false);
    }
    load();
  }, []);

  const selectedDisease = diseases.find((d) => d.id === selectedId) ?? diseases[0];

  function isZoneActive(zone: string) {
    return selectedDisease?.zones.some((z) => z.zone === zone) ?? false;
  }
  function zoneIntensity(zone: string) {
    return selectedDisease?.zones.find((z) => z.zone === zone)?.intensity ?? 0;
  }

  // Zone coverage % for the selected disease (out of ALL_ZONES)
  const zoneCoverage = selectedDisease
    ? Math.round((selectedDisease.zones.filter((z) => ALL_ZONES.includes(z.zone)).length / ALL_ZONES.length) * 100)
    : 0;

  // Navigate to AI Guidance with disease context
  function goToAIGuidance() {
    const param = selectedDisease ? `?disease=${encodeURIComponent(selectedDisease.label.toLowerCase())}` : "";
    router.push(`/ai-guidance${param}`);
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <main className="pt-20 min-h-screen flex flex-col items-center">

        {/* Hero Title */}
        <section className="w-full max-w-[1200px] px-16 py-16 text-center">
          <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">
            Diagnostic Visualization
          </span>
          <h1 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight mb-6">
            The Human Body Atlas
          </h1>
          <p className="max-w-2xl mx-auto font-sans text-base text-[#4c4546] leading-relaxed">
            An intuitive, editorial exploration of disease progression. Select a pathology below to visualize its physiological footprint across the human anatomy.
          </p>
          {/* DB source badge */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${dbLoaded ? "bg-[#50a14f]" : "bg-[#986801]"}`} />
            <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">
              {loading ? "Loading atlas data..." : dbLoaded
                ? `${diseases.length} pathologies loaded from database`
                : `${diseases.length} pathologies (demo data)`}
            </span>
          </div>
        </section>

        {/* Main Stage */}
        <section className="w-full max-w-[1200px] px-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start pb-32">

          {/* Sidebar — Disease Selection */}
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
                    <button key={d.id} onClick={() => setSelectedId(d.id)}
                      className="w-full text-left border-t border-[#cfc4c5] pt-6 pb-6 transition-all duration-300 hover:opacity-80 active:scale-95">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-sans text-[10px] font-semibold tracking-[0.2em] text-[#5e5e5e]">{d.num}</span>
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      </div>
                      <h3 className="font-serif font-medium text-2xl mb-1">{d.label}</h3>
                      {selectedId === d.id && <p className="font-sans text-xs text-[#5e5e5e] mb-2">{d.desc}</p>}
                      <div className="h-0.5 rounded-full transition-all duration-500 origin-left"
                        style={{ background: d.color, width: selectedId === d.id ? "100%" : "0%" }} />
                    </button>
                  ))}
            </div>

            {/* → AI Guidance (with selected disease context) */}
            <button
              onClick={goToAIGuidance}
              className="mt-4 flex items-center justify-between p-6 bg-[#eeeeee] rounded-xl border border-[#cfc4c5] hover:bg-black hover:text-white hover:border-black transition-all group">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">compare_arrows</span>
                <div className="text-left">
                  <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase block">Symptom Analysis</span>
                  <p className="font-sans text-[10px] uppercase tracking-wider mt-1 opacity-60">
                    {selectedDisease ? `Run AI for ${selectedDisease.label} →` : "Run AI guidance →"}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </aside>

          {/* Center — Body SVG */}
          <div className="md:col-span-6 flex flex-col items-center justify-center relative min-h-[700px]">
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

            <div className="w-full flex items-center justify-center" style={{ height: 600, perspective: 1000 }}>
              <div className="relative w-72 h-[550px]"
                style={{ transition: "transform 0.7s ease-in-out", transform: side === "back" ? "rotateY(180deg)" : "rotateY(0deg)" }}>

                {/* Body silhouette */}
                <svg className="w-full h-full absolute inset-0 text-[#4c4546] opacity-20" fill="currentColor" viewBox="0 0 200 500">
                  <path d="M100,20 C110,20 120,30 120,45 C120,60 110,70 100,70 C90,70 80,60 80,45 C80,30 90,20 100,20 Z M100,75 C115,75 140,85 145,110 L155,200 C157,215 145,225 135,215 L125,180 L125,320 L135,480 C136,495 125,500 115,495 L100,470 L85,495 C75,500 64,495 65,480 L75,320 L75,180 L65,215 C55,225 43,215 45,200 L55,110 C60,85 85,75 100,75 Z" />
                </svg>

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  </div>
                )}

                {!loading && side === "front" && (
                  <>
                    <BodyZone id="head" active={isZoneActive("head")} intensity={zoneIntensity("head")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[35px] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full" />
                    <BodyZone id="chest" active={isZoneActive("chest")} intensity={zoneIntensity("chest")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[110px] left-1/2 -translate-x-1/2 w-20 h-24 rounded-full" />
                    <BodyZone id="lungs" active={isZoneActive("lungs")} intensity={zoneIntensity("lungs")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[120px] left-1/2 -translate-x-1/2 w-24 h-16 rounded-[50%]" />
                    <BodyZone id="liver" active={isZoneActive("liver")} intensity={zoneIntensity("liver")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[160px] left-[55%] -translate-x-1/2 w-10 h-10 rounded-full" />
                    <BodyZone id="joints" active={isZoneActive("joints")} intensity={zoneIntensity("joints")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[280px] left-[35%] w-6 h-6 rounded-full" />
                    <BodyZone id="joints-r" active={isZoneActive("joints")} intensity={zoneIntensity("joints")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[280px] right-[35%] w-6 h-6 rounded-full" />
                  </>
                )}

                {!loading && side === "back" && (
                  <>
                    <BodyZone id="spine" active={isZoneActive("spine")} intensity={zoneIntensity("spine")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[120px] left-1/2 -translate-x-1/2 w-4 h-64 rounded-full" />
                    <BodyZone id="shoulders" active={isZoneActive("shoulders")} intensity={zoneIntensity("shoulders")} color={selectedDisease?.color ?? "#5e5e5e"}
                      className="absolute top-[95px] left-1/2 -translate-x-1/2 w-32 h-10 rounded-[40%]" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="md:col-span-3 flex flex-col gap-6 sticky top-32">
            {/* Active disease badge */}
            {loading ? (
              <div className="animate-pulse h-12 bg-[#e2e2e2] rounded-xl" />
            ) : (
              <div className="flex gap-2 items-center p-4 rounded-xl border border-[#cfc4c5] bg-white">
                <div className="w-3 h-3 rounded-full" style={{ background: selectedDisease?.color }} />
                <span className="font-sans text-xs font-semibold tracking-wider uppercase">{selectedDisease?.label}</span>
              </div>
            )}

            {/* Affected zone count */}
            {!loading && selectedDisease && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-[#cfc4c5] bg-white flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">Zones</span>
                  <span className="font-serif text-2xl font-medium">{selectedDisease.zones.length}</span>
                  <span className="font-mono text-[9px] text-[#5e5e5e]">affected</span>
                </div>
                <div className="p-4 rounded-xl border border-[#cfc4c5] bg-white flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest">Coverage</span>
                  <span className="font-serif text-2xl font-medium">{zoneCoverage}%</span>
                  <span className="font-mono text-[9px] text-[#5e5e5e]">of atlas</span>
                </div>
              </div>
            )}

            {/* Symptom Clusters — dynamic per disease */}
            <div>
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">Key Symptoms</span>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse h-20 bg-[#e2e2e2] rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(selectedDisease?.symptoms ?? []).map((s) => (
                    <div key={s.label} className="p-4 rounded-xl border border-black bg-black text-white flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                      <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-center">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA → AI Guidance (with disease context) */}
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={goToAIGuidance}>
              <img src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80" alt="AI guidance"
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700"
                style={{ filter: "grayscale(1) brightness(0.4)" }} />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 block mb-2">AI Analysis</span>
                <p className="font-serif text-white text-base font-medium leading-tight">
                  {selectedDisease ? `Check ${selectedDisease.label} symptoms →` : "Check your symptoms →"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pathological Flow section */}
        <section className="w-full bg-[#f3f3f4] py-32">
          <div className="max-w-[1200px] mx-auto px-16 flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-3/5">
              <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">Evolution</span>
              <h2 className="font-serif text-[42px] font-light leading-[1.3] mb-12">Pathological Flow</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {[
                  { icon: "blur_on",  title: "Cellular Disruption",    desc: "Cellular disruption patterns mapped via real-time satellite health data and clinical observation protocols." },
                  { icon: "waves",    title: "Epidemiological Waves",   desc: "Epidemiological waves visualized through anatomical heat gradients and joint-stress indicators." },
                ].map((item) => (
                  <div key={item.title} className="p-8 bg-white rounded-2xl border border-[#cfc4c5]">
                    <span className="material-symbols-outlined text-black mb-4 block">{item.icon}</span>
                    <h3 className="font-serif font-medium text-lg mb-3">{item.title}</h3>
                    <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status — real stats from loaded data */}
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
                      <span className="font-serif font-semibold text-[64px] leading-none">{String(diseases.length).padStart(2, "0")}</span>
                      <span className="font-serif text-2xl text-white/60 mb-3">/{FALLBACK.length}</span>
                    </div>
                    <p className="font-sans text-xs text-white/60 uppercase tracking-wider mb-2">
                      Pathologies Tracked
                    </p>
                    <p className="font-sans text-[10px] text-white/40 uppercase tracking-widest mb-6">
                      {dbLoaded ? "Live · Database" : "Demo Data"}
                    </p>

                    {/* Mini disease list */}
                    <div className="space-y-3 mb-8">
                      {diseases.map((d) => (
                        <div key={d.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                            <span className="font-sans text-xs text-white/70">{d.label}</span>
                          </div>
                          <span className="font-mono text-[10px] text-white/40">{d.zones.length} zone{d.zones.length !== 1 ? "s" : ""}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={goToAIGuidance}
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

function BodyZone({ active, intensity, color, className }: {
  active: boolean; intensity: number; color: string; className: string; id: string;
}) {
  return (
    <div className={`${className} transition-all duration-700`}
      style={{
        background: active ? color : "transparent",
        opacity: active ? 0.15 + intensity * 0.65 : 0.1,
        filter: active ? `blur(${8 - intensity * 4}px)` : "blur(8px)",
        border: active ? `2px solid ${color}` : "none",
      }}
    />
  );
}

// Type guards for JSON fields from Supabase
function isZoneArray(val: unknown): val is ZoneEntry[] {
  return Array.isArray(val) && val.every(
    (e) => typeof e === "object" && e !== null && "zone" in e && "intensity" in e
  );
}
function isSymptomArray(val: unknown): val is SymptomEntry[] {
  return Array.isArray(val) && val.every(
    (e) => typeof e === "object" && e !== null && "icon" in e && "label" in e
  );
}
