"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RiskEvent } from "@/lib/supabase/types";

type Symptom = { id: string; icon: string; label: string; keywords: string[] };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string } | undefined;
};
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const SYMPTOMS: Symptom[] = [
  { id: "fever",    icon: "thermostat", label: "Fever",    keywords: ["fever", "hot", "temperature", "burning"] },
  { id: "cough",    icon: "air",        label: "Cough",    keywords: ["cough", "coughing", "throat"] },
  { id: "fatigue",  icon: "bed",        label: "Fatigue",  keywords: ["tired", "fatigue", "weak", "exhausted"] },
  { id: "chills",   icon: "waves",      label: "Chills",   keywords: ["chills", "shiver", "cold"] },
  { id: "headache", icon: "psychology", label: "Headache", keywords: ["headache", "head", "pain"] },
  { id: "other",    icon: "add",        label: "Other",    keywords: ["pain", "ache", "sick", "nausea", "vomit"] },
];

type Finding = { disease: string; probability: string; pct: string; desc: string };

function extractSymptoms(transcript: string): string[] {
  const lower = transcript.toLowerCase();
  return SYMPTOMS.filter((s) => s.keywords.some((kw) => lower.includes(kw))).map((s) => s.id);
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

// Hardcoded fallback — used until pathologies table is loaded from DB
const FALLBACK_DISEASE_SYMPTOM_MAP: Record<string, string[]> = {
  malaria:   ["fever", "chills", "headache", "fatigue"],
  influenza: ["fever", "cough", "headache"],
  dengue:    ["fever", "headache", "other"],
  tb:        ["cough", "fatigue"],
};

// Maps a free-text DB symptom string to one of the SYMPTOMS ids
const VALID_SYMPTOM_IDS = new Set(["fever", "cough", "fatigue", "chills", "headache", "other"]);
function mapToSymptomId(dbSymptom: string): string | null {
  const s = dbSymptom.toLowerCase().trim();
  if (VALID_SYMPTOM_IDS.has(s)) return s;
  if (s.includes("fever") || s.includes("temperature") || s.includes("hot")) return "fever";
  if (s.includes("cough") || s.includes("throat") || s.includes("chest")) return "cough";
  if (s.includes("fatigue") || s.includes("tired") || s.includes("weak") || s.includes("weight")) return "fatigue";
  if (s.includes("chill") || s.includes("sweat") || s.includes("shiver") || s.includes("night")) return "chills";
  if (s.includes("head") || s.includes("eye") || s.includes("migraine")) return "headache";
  if (s.includes("pain") || s.includes("ache") || s.includes("nausea") || s.includes("rash") || s.includes("joint") || s.includes("vomit")) return "other";
  return null;
}

// Derive severity from the top finding's probability string e.g. "72%"
function pctToSeverity(pct: string): "high" | "medium" | "low" {
  const n = parseInt(pct.replace("%", ""), 10);
  if (isNaN(n)) return "medium";
  if (n >= 70) return "high";
  if (n >= 40) return "medium";
  return "low";
}

// Normalise Gemini disease name → heatmap filter tag
function normalizeDiseaseTag(disease: string): string {
  const u = disease.toUpperCase();
  if (u.includes("MALARIA"))                       return "MALARIA";
  if (u.includes("DENGUE"))                        return "DENGUE";
  if (u.includes("TUBERC") || u === "TB")         return "TB";
  if (u.includes("INFLUEN") || u.includes("FLU") || u.includes("H1N1")) return "INFLUENZA";
  return u.replace(/[^A-Z0-9]/g, "_").slice(0, 20);
}

// Color for risk level
function riskColor(level: string) {
  const l = level.toUpperCase();
  if (l === "LOW") return "#50a14f";
  if (l === "MEDIUM" || l === "MODERATE") return "#986801";
  return "#ba1a1a";
}

export default function AIGuidancePage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const supabase      = createClient();

  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [prefillDisease, setPrefillDisease] = useState<string | null>(null);
  const [diseaseSymptomMap, setDiseaseSymptomMap] = useState<Record<string, string[]>>(FALLBACK_DISEASE_SYMPTOM_MAP);
  const [loading, setLoading]             = useState(false);
  const [results, setResults]             = useState<Finding[] | null>(null);
  const [logSaved, setLogSaved]           = useState(false);
  const [error, setError]                 = useState("");
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);

  // Risk alert from DB
  const [riskAlert, setRiskAlert]         = useState<RiskEvent | null>(null);
  const [alertLoading, setAlertLoading]   = useState(true);

  // Item 10: Load pathologies from DB → build dynamic DISEASE_SYMPTOM_MAP
  useEffect(() => {
    supabase
      .from("pathologies")
      .select("name, symptom_clusters")
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const built: Record<string, string[]> = { ...FALLBACK_DISEASE_SYMPTOM_MAP };
        data.forEach((p) => {
          if (!p.name || !p.symptom_clusters) return;
          const clusters = p.symptom_clusters as string[];
          if (!Array.isArray(clusters)) return;
          const mappedIds = Array.from(
            new Set(clusters.map(mapToSymptomId).filter((id): id is string => id !== null))
          );
          if (mappedIds.length > 0) {
            built[p.name.toLowerCase()] = mappedIds;
            // Also map common abbreviations
            if (p.name.toLowerCase() === "tuberculosis") built["tb"] = mappedIds;
          }
        });
        setDiseaseSymptomMap(built);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-select symptoms when arriving from Body Atlas via ?disease= query param
  useEffect(() => {
    const disease = searchParams.get("disease")?.toLowerCase() ?? null;
    if (!disease) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefillDisease(disease);
    const preselected = diseaseSymptomMap[disease];
    if (preselected) setSelected(new Set(preselected));
  }, [searchParams, diseaseSymptomMap]);

  // Load latest risk event for the Local Threat Alert panel
  useEffect(() => {
    supabase
      .from("risk_events")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setRiskAlert(data ?? null);
        setAlertLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocation for heatmap contribution
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Voice state
  const [voiceActive, setVoiceActive]       = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const voiceSupported = Boolean(getSpeechRecognitionConstructor());
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const synthRef       = useRef<SpeechSynthesis | null>(null);
  const voiceRef       = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous     = false;
      rec.interimResults = true;
      rec.lang           = "en-US";
      rec.onresult = (e) => {
        const transcript = Array.from(e.results, (result) => result[0]?.transcript ?? "").join(" ");
        setVoiceTranscript(transcript);
        if (e.results[0]?.isFinal) {
          const found = extractSymptoms(transcript);
          if (found.length > 0) {
            setSelected((prev) => new Set([...prev, ...found]));
            speak(`Detected: ${found.join(", ")}. Tap Analyse when ready.`);
          } else {
            speak("No symptoms recognised. Please try again or select manually.");
          }
          setVoiceActive(false);
        }
      };
      rec.onerror = () => { setVoiceActive(false); };
      rec.onend   = () => { setVoiceActive(false); };
      recognitionRef.current = rec;
    }
    synthRef.current = window.speechSynthesis;

    // Pick the best available English TTS voice
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => /google.*us.*english/i.test(v.name)) ??
        voices.find((v) => /google.*english/i.test(v.name)) ??
        voices.find((v) => v.lang === "en-US" && !v.localService) ??
        voices.find((v) => v.lang.startsWith("en-US")) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }, []);

  // Try to get user location for heatmap contribution (silent fail → null)
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* silent — fall back to null */ },
      { timeout: 8_000, enableHighAccuracy: false },
    );
  }, []);

  function speak(text: string) {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = "en-US";
    utt.rate  = 0.92;
    utt.pitch = 1.0;
    if (voiceRef.current) utt.voice = voiceRef.current;
    synthRef.current.speak(utt);
  }

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (voiceActive) {
      recognitionRef.current.stop();
      setVoiceActive(false);
      setVoiceTranscript("");
    } else {
      setVoiceTranscript("");
      setResults(null);
      setError("");
      recognitionRef.current.start();
      setVoiceActive(true);
      speak("Please describe your symptoms.");
    }
  }

  function toggleSymptom(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResults(null);
    setLogSaved(false);
    setError("");
  }

  const analyse = useCallback(async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError("");
    setResults(null);
    setLogSaved(false);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: Array.from(selected) }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.findings) {
          setResults(data.findings);

          // Read top result aloud
          if (data.findings.length > 0) {
            const top = data.findings[0];
            speak(`Analysis complete. Top match: ${top.disease} at ${top.pct} probability.`);
          }

          // Save to health_logs so Profile page reflects the analysis
          const { data: { user } } = await supabase.auth.getUser();
          if (user && data.findings.length > 0) {
            const top         = data.findings[0] as Finding;
            const severity    = pctToSeverity(top.pct);
            const findingsStr = (data.findings as Finding[])
              .map((f) => `${f.disease} ${f.pct}`)
              .join(" · ");
            // Include the selected symptoms so Profile can display them
            const symptomList = Array.from(selected).join(", ");

            // ── Save to personal health log ─────────────────────────────
            const { error: logErr } = await supabase.from("health_logs").insert({
              user_id:    user.id,
              event_date: new Date().toISOString().split("T")[0],
              type:       top.disease,
              severity,
              note:       `Symptoms: ${symptomList} | ${findingsStr}`,
            });
            if (!logErr) setLogSaved(true);

            // ── Contribute anonymised signal to community heatmap ────────
            const intensity = Math.min(
              1,
              Math.max(0, parseInt(top.pct.replace("%", ""), 10) / 100),
            );
            // Use real location if available; blur by ±~200 m for privacy
            const loc = userLocation ?? { lat: -1.2921, lng: 36.8219 };
            await supabase.from("heatmap_reports").insert({
              disease_tag:  normalizeDiseaseTag(top.disease),
              intensity,
              lat:          loc.lat + (Math.random() - 0.5) * 0.004,
              lng:          loc.lng + (Math.random() - 0.5) * 0.004,
              neighborhood: "Community Report",
              reported_at:  new Date().toISOString(),
            });
          }
        } else {
          setError("Analysis failed. Please try again.");
        }
      } else if (res.status === 429) {
        setError("Rate limit reached. Please wait a minute and try again.");
      } else {
        setError("Analysis failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, userLocation]);

  // Risk alert display helpers
  const alertLevel = riskAlert?.level ?? "MEDIUM";
  const alertColor = riskColor(alertLevel);
  const alertBg =
    alertLevel.toUpperCase() === "HIGH"
      ? "bg-[#fff0f0] border-[#f5c6c6]"
      : alertLevel.toUpperCase() === "LOW"
      ? "bg-[#f0fff4] border-[#b7e4c7]"
      : "bg-[#fffbe6] border-[#ffe08a]";

  return (
    <div className="min-h-screen bg-[#f9f9f9] overflow-x-hidden">

      {/* Specialist modal */}
      {showSpecialistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSpecialistModal(false)}>
          <div className="bg-white rounded-[40px] p-12 max-w-md mx-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <span className="material-symbols-outlined text-4xl text-black mb-4 block">medical_services</span>
            <h3 className="font-serif font-medium text-2xl mb-4">On-Call Specialist</h3>
            <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed mb-8">
              In a real emergency, please contact your local health authority or nearest clinic.
              PANACEA connects with regional health networks in the full release.
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-[#f3f3f4] rounded-xl text-left">
                <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-1">Emergency</p>
                <p className="font-serif font-medium text-xl">Call 911 / 999</p>
              </div>
              <button onClick={() => setShowSpecialistModal(false)}
                className="w-full py-3 rounded-full bg-black text-white font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1200px] mx-auto px-16 py-12 pt-32">

        {/* Disease context banner — shown when arriving from Body Atlas */}
        {prefillDisease && (
          <div className="mb-8 flex items-center justify-between gap-4 px-6 py-4 rounded-2xl border border-[#cfc4c5] bg-white">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-black text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
              <div>
                <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">Body Atlas Context</p>
                <p className="font-sans text-sm text-black">
                  Symptoms pre-selected for{" "}
                  <span className="font-semibold capitalize">{prefillDisease}</span>.
                  Review and adjust below.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setPrefillDisease(null); setSelected(new Set()); }}
              className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors whitespace-nowrap">
              Clear ×
            </button>
          </div>
        )}

        {/* Voice Assistant — Web Speech API */}
        <section className="mb-32">
          <div
            onClick={voiceSupported ? toggleVoice : undefined}
            className={`rounded-full px-8 py-6 flex items-center justify-between border transition-all ${
              voiceActive
                ? "border-black bg-black text-white"
                : "border-[#cfc4c5] cursor-pointer hover:border-black"
            } ${voiceSupported ? "cursor-pointer" : "cursor-default"}`}
            style={{ background: voiceActive ? "#000" : "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)" }}
          >
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${voiceActive ? "bg-white" : "bg-black"}`}>
                  <span className={`material-symbols-outlined ${voiceActive ? "text-black" : "text-white"}`}>
                    {voiceActive ? "mic" : "mic_off"}
                  </span>
                </div>
                {voiceActive && <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />}
              </div>
              <div>
                <span className={`font-sans text-[10px] font-semibold tracking-[0.2em] uppercase block mb-1 ${voiceActive ? "text-white/60" : "text-[#5e5e5e]"}`}>
                  {voiceSupported ? "Voice Input" : "Voice Not Supported"}
                </span>
                <p className={`font-serif font-medium text-2xl leading-none ${voiceActive ? "text-white" : "text-black"}`}>
                  {voiceActive
                    ? (voiceTranscript || "Listening...")
                    : voiceSupported
                      ? `"Describe your symptoms aloud..."`
                      : "Select symptoms below"}
                </p>
              </div>
            </div>
            {voiceSupported && (
              <div className={`hidden md:flex gap-2 items-center ${voiceActive ? "text-white" : "text-[#5e5e5e]"}`}>
                <span className="font-mono text-xs">{voiceActive ? "AI LISTENING" : "TAP TO SPEAK"}</span>
                {voiceActive && (
                  <div className="flex gap-1 h-4 items-end">
                    {[0.1, 0.2, 0.3].map((d, i) => (
                      <div key={i} className="w-1 bg-white rounded-sm animate-bounce"
                        style={{ height: i === 1 ? "16px" : "8px", animationDelay: `${d}s` }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Steps */}
          <div className="lg:col-span-7 space-y-32">

            {/* Step 1 — Location hotspots */}
            <div>
              <div className="mb-8">
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-2">01 — Location</span>
                <h2 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight">Pinpoint the Area.</h2>
              </div>
              <div className="relative bg-[#f3f3f4] rounded-xl overflow-hidden aspect-video border border-[#cfc4c5] group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80"
                  alt="Human Anatomy"
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  style={{ filter: "grayscale(1)" }}
                />
                {/* Head — headache */}
                <div
                  className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-150 ${selected.has("headache") ? "bg-black" : "bg-[#cfc4c5] hover:bg-black"}`}
                  style={{ top: "15%", left: "50%", boxShadow: selected.has("headache") ? "0 0 0 8px rgba(0,0,0,0.15)" : "none" }}
                  onClick={() => toggleSymptom("headache")}
                  title="Head — Headache"
                />
                {/* Chest — cough */}
                <div
                  className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-150 ${selected.has("cough") ? "bg-black" : "bg-[#cfc4c5] hover:bg-black"}`}
                  style={{ top: "28%", left: "48%", boxShadow: selected.has("cough") ? "0 0 0 8px rgba(0,0,0,0.15)" : "none" }}
                  onClick={() => toggleSymptom("cough")}
                  title="Chest — Cough"
                />
                {/* Abdomen — fever */}
                <div
                  className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-150 ${selected.has("fever") ? "bg-black" : "bg-[#cfc4c5] hover:bg-black"}`}
                  style={{ top: "42%", left: "52%", boxShadow: selected.has("fever") ? "0 0 0 8px rgba(0,0,0,0.15)" : "none" }}
                  onClick={() => toggleSymptom("fever")}
                  title="Abdomen — Fever / Chills"
                />
                {/* Legs — fatigue */}
                <div
                  className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-150 ${selected.has("fatigue") ? "bg-black" : "bg-[#cfc4c5] hover:bg-black"}`}
                  style={{ top: "65%", left: "46%", boxShadow: selected.has("fatigue") ? "0 0 0 8px rgba(0,0,0,0.15)" : "none" }}
                  onClick={() => toggleSymptom("fatigue")}
                  title="Lower Body — Fatigue / Joint Pain"
                />
                <div className="absolute bottom-4 left-4 bg-black/50 text-white text-[10px] font-sans px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Tap hotspots to select symptoms
                </div>
                {/* Active symptom labels */}
                {selected.size > 0 && (
                  <div className="absolute top-4 right-4 flex flex-wrap gap-1 justify-end max-w-[160px]">
                    {Array.from(selected).map((id) => {
                      const s = SYMPTOMS.find((s) => s.id === id);
                      return s ? (
                        <span key={id} className="bg-black text-white text-[9px] font-sans px-2 py-1 rounded-full font-semibold tracking-wider uppercase">
                          {s.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 — Symptoms grid */}
            <div>
              <div className="mb-8">
                <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-2">02 — Presentation</span>
                <h2 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight">Identify Symptoms.</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {SYMPTOMS.map((s) => {
                  const active = selected.has(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSymptom(s.id)}
                      className={`flex flex-col items-center justify-center p-8 border rounded-xl transition-all group ${
                        active
                          ? "bg-black text-white border-black shadow-lg"
                          : "border-[#cfc4c5] hover:bg-black hover:text-white hover:border-black"
                      }`}>
                      <span className="material-symbols-outlined text-4xl mb-4 group-hover:scale-110 transition-transform">{s.icon}</span>
                      <span className="font-sans text-xs font-semibold tracking-widest uppercase">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={analyse}
                disabled={loading || selected.size === 0}
                className="mt-8 w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-colors disabled:opacity-40 active:scale-95"
              >
                {loading
                  ? "Analysing..."
                  : selected.size === 0
                    ? "Select at least one symptom"
                    : `Run AI Analysis (${selected.size} symptom${selected.size > 1 ? "s" : ""})`}
              </button>
              {error && <p className="mt-4 text-center font-sans text-xs text-[#ba1a1a]">{error}</p>}
            </div>
          </div>

          {/* Right: Step 3 — Results + Alert */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-8">

              {/* Results card */}
              <div className="rounded-xl p-8 relative overflow-hidden border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)" }}>
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: "linear-gradient(45deg, #1b1b1b, #5e5e5e)", filter: "blur(40px)", opacity: 0.08, animation: "drift 10s infinite alternate ease-in-out" }} />

                <div className="mb-8">
                  <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-2">03 — Intelligence</span>
                  <h2 className="font-serif font-medium text-2xl">Synthesis Results</h2>
                  <div className="mt-4 h-px bg-[#cfc4c5] w-full" />
                </div>

                {!results && !loading && (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-[#cfc4c5] block mb-4">biotech</span>
                    <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest leading-relaxed">
                      {voiceSupported
                        ? "Speak or select symptoms,\nthen run AI Analysis"
                        : "Select symptoms above\nand run AI Analysis"}
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="py-12 text-center space-y-4">
                    <div className="flex justify-center gap-2">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-black animate-bounce"
                          style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                    <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">Analysing symptoms...</p>
                  </div>
                )}

                {results && (
                  <>
                    <div className="space-y-6">
                      {results.map((r, i) => (
                        <div key={i} className="border-t border-[#cfc4c5] pt-4">
                          <div className="flex justify-between items-end mb-2">
                            <div>
                              <h3 className="font-serif font-medium text-2xl">{r.disease}</h3>
                              <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">{r.probability}</p>
                            </div>
                            <span className="font-mono text-2xl font-semibold">{r.pct}</span>
                          </div>
                          <div className="h-0.5 bg-black w-1/3" />
                          {r.desc && <p className="mt-4 text-sm text-[#5e5e5e] leading-relaxed">{r.desc}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Log + heatmap saved confirmation */}
                    {logSaved && (
                      <div className="mt-6 space-y-2">
                        <div className="flex items-center gap-2 px-4 py-3 bg-[#f0fff4] border border-[#b7e4c7] rounded-xl">
                          <span className="material-symbols-outlined text-[#50a14f] text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#50a14f]">
                            Saved to Health Log
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3 bg-[#f0f4ff] border border-[#c6d4f5] rounded-xl">
                          <span className="material-symbols-outlined text-[#4078f2] text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                          <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#4078f2]">
                            Contributed to Community Heatmap
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 space-y-3">
                      <button
                        onClick={() => router.push("/profile")}
                        className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-colors active:scale-95">
                        View Health Profile
                      </button>
                      <button
                        onClick={() => router.push("/heatmap")}
                        className="w-full py-3 border border-black text-black rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">map</span>
                        See Community Heatmap
                      </button>
                      {results && results[0] && (
                        <button
                          onClick={() => router.push(`/body-atlas?disease=${encodeURIComponent(results![0].disease.toLowerCase())}`)}
                          className="w-full py-3 border border-[#cfc4c5] text-[#5e5e5e] rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:border-black hover:text-black transition-all flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">accessibility</span>
                          View Body Atlas
                        </button>
                      )}
                      <button
                        onClick={() => setShowSpecialistModal(true)}
                        className="w-full py-3 text-[#5e5e5e] rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:text-black transition-all">
                        Consult On-Call Specialist
                      </button>
                    </div>
                  </>
                )}

                <p className="mt-6 font-sans text-[10px] text-[#5e5e5e] uppercase tracking-widest leading-relaxed text-center">
                  For educational reference only. Not medical advice.
                </p>
              </div>

              {/* Local Threat Alert — live from risk_events DB */}
              {alertLoading ? (
                <div className="p-6 bg-[#e2e2e2] rounded-xl border border-[#cfc4c5] animate-pulse">
                  <div className="h-3 w-32 bg-[#cfc4c5] rounded mb-3" />
                  <div className="h-3 w-48 bg-[#cfc4c5] rounded" />
                </div>
              ) : riskAlert ? (
                <div className={`p-6 rounded-xl border flex gap-4 items-start ${alertBg}`}>
                  <span
                    className="material-symbols-outlined mt-0.5"
                    style={{ color: alertColor, fontVariationSettings: "'FILL' 1", fontSize: "20px" }}
                  >
                    {riskAlert.level?.toUpperCase() === "HIGH" ? "warning" :
                     riskAlert.level?.toUpperCase() === "LOW"  ? "check_circle" : "info"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase"
                        style={{ color: alertColor }}>
                        Local Risk · {riskAlert.level?.toUpperCase()}
                      </span>
                      {riskAlert.recorded_at && (
                        <span className="font-mono text-[9px] text-[#5e5e5e]">
                          {new Date(riskAlert.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#4c4546] leading-relaxed">
                      {riskAlert.description ??
                        `${riskAlert.level} risk level detected in ${riskAlert.location ?? "your region"}.`}
                    </p>
                    {riskAlert.location && (
                      <p className="font-mono text-[10px] text-[#5e5e5e] mt-2 uppercase tracking-widest">
                        {riskAlert.location}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push("/heatmap")}
                    className="flex-shrink-0 font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors mt-0.5">
                    Map →
                  </button>
                </div>
              ) : (
                /* Fallback when no risk events in DB */
                <div className="p-6 bg-[#e2e2e2] rounded-xl border border-[#cfc4c5] flex gap-4 items-start">
                  <span className="material-symbols-outlined text-[#5e5e5e]">info</span>
                  <div>
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-1">
                      Local Threat Alert
                    </span>
                    <p className="text-sm text-[#4c4546]">No active alerts in your region.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes drift { from{transform:translate(0,0) scale(1)} to{transform:translate(20px,15px) scale(1.1)} }
      `}</style>
    </div>
  );
}
