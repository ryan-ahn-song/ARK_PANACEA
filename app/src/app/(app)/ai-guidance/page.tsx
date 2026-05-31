"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  { id: "fever", icon: "thermostat", label: "Fever", keywords: ["fever", "hot", "temperature", "burning", "열"] },
  { id: "cough", icon: "air", label: "Cough", keywords: ["cough", "coughing", "throat", "기침"] },
  { id: "fatigue", icon: "bed", label: "Fatigue", keywords: ["tired", "fatigue", "weak", "exhausted", "피로"] },
  { id: "chills", icon: "waves", label: "Chills", keywords: ["chills", "shiver", "cold", "오한"] },
  { id: "headache", icon: "psychology", label: "Headache", keywords: ["headache", "head", "pain", "두통"] },
  { id: "other", icon: "add", label: "Other", keywords: ["pain", "ache", "sick", "nausea", "vomit"] },
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

export default function AIGuidancePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Finding[] | null>(null);
  const [error, setError] = useState("");
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);

  // Voice state
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const voiceSupported = Boolean(getSpeechRecognitionConstructor());
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (e) => {
        const transcript = Array.from(e.results, (result) => result[0]?.transcript ?? "").join(" ");
        setVoiceTranscript(transcript);
        if (e.results[0]?.isFinal) {
          const found = extractSymptoms(transcript);
          if (found.length > 0) {
            setSelected((prev) => new Set([...prev, ...found]));
            speak(`I detected ${found.join(", ")}. Click Run AI Analysis when ready.`);
          } else {
            speak("I couldn't identify any symptoms. Please try again or select manually.");
          }
          setVoiceActive(false);
        }
      };
      rec.onerror = () => { setVoiceActive(false); };
      rec.onend = () => { setVoiceActive(false); };
      recognitionRef.current = rec;
    }
    synthRef.current = window.speechSynthesis;
  }, []);

  function speak(text: string) {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setResults(null);
    setError("");
  }

  const analyse = useCallback(async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError("");
    setResults(null);

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
          // 결과를 음성으로 읽기
          if (data.findings.length > 0) {
            const top = data.findings[0];
            speak(`Analysis complete. Top match: ${top.disease} at ${top.pct} probability.`);
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
  }, [selected]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] overflow-x-hidden">

      {/* Specialist modal */}
      {showSpecialistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSpecialistModal(false)}>
          <div className="bg-white rounded-[40px] p-12 max-w-md mx-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <span className="material-symbols-outlined text-4xl text-black mb-4 block">medical_services</span>
            <h3 className="font-serif font-medium text-2xl mb-4">On-Call Specialist</h3>
            <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed mb-8">
              In a real emergency, please contact your local health authority or nearest clinic. PANACEA connects with regional health networks in the full release.
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

        {/* Voice Assistant — 실제 Web Speech API */}
        <section className="mb-32">
          <div
            onClick={voiceSupported ? toggleVoice : undefined}
            className={`rounded-full px-8 py-6 flex items-center justify-between border transition-all ${
              voiceActive ? "border-black bg-black text-white" : "border-[#cfc4c5] cursor-pointer hover:border-black"
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

            {/* Step 1 — Location */}
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
                <div
                  className="absolute w-4 h-4 bg-black rounded-full cursor-pointer hover:scale-150 transition-transform"
                  style={{ top: "25%", left: "48%", boxShadow: "0 0 0 8px rgba(0,0,0,0.15)" }}
                  onClick={() => { toggleSymptom("cough"); toggleSymptom("fever"); }}
                  title="Chest"
                />
                <div
                  className="absolute w-4 h-4 bg-[#cfc4c5] rounded-full hover:bg-black cursor-pointer transition-colors hover:scale-150"
                  style={{ top: "15%", left: "50%" }}
                  onClick={() => toggleSymptom("headache")}
                  title="Head"
                />
                <div
                  className="absolute w-4 h-4 bg-[#cfc4c5] rounded-full hover:bg-black cursor-pointer transition-colors hover:scale-150"
                  style={{ top: "45%", left: "40%" }}
                  onClick={() => toggleSymptom("fatigue")}
                  title="Body"
                />
                <div className="absolute bottom-4 left-4 bg-black/50 text-white text-[10px] font-sans px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Tap hotspots to select symptoms
                </div>
              </div>
            </div>

            {/* Step 2 — Symptoms */}
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
                        active ? "bg-black text-white border-black shadow-lg" : "border-[#cfc4c5] hover:bg-black hover:text-white hover:border-black"
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

          {/* Right: Step 3 — AI Synthesis */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-8">

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
                      {voiceSupported ? "Speak or select symptoms,\nthen run AI Analysis" : "Select symptoms above\nand run AI Analysis"}
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="py-12 text-center space-y-4">
                    <div className="flex justify-center gap-2">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-black animate-bounce" style={{ animationDelay: `${d}s` }} />
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

                    <div className="mt-12 space-y-4">
                      <button
                        onClick={() => router.push("/profile")}
                        className="w-full py-4 bg-black text-white rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-colors active:scale-95">
                        View Health Profile
                      </button>
                      <button
                        onClick={() => setShowSpecialistModal(true)}
                        className="w-full py-4 border border-black text-black rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-black hover:text-white transition-all">
                        Consult On-Call Specialist
                      </button>
                    </div>
                  </>
                )}

                <p className="mt-6 font-sans text-[10px] text-[#5e5e5e] uppercase tracking-widest leading-relaxed text-center">
                  For educational reference only. Not medical advice.
                </p>
              </div>

              {/* Alert banner */}
              <div className="p-6 bg-[#e2e2e2] rounded-xl border border-[#cfc4c5] flex gap-4 items-start">
                <span className="material-symbols-outlined text-black">info</span>
                <div>
                  <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-black block mb-1">Local Threat Alert</span>
                  <p className="text-sm text-[#4c4546]">There is an ongoing Influenza outbreak reported within a 5km radius of your current location.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-32 bg-white border-t border-[#cfc4c5] mt-32">
        <div className="max-w-[1200px] mx-auto px-16 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-serif font-medium text-2xl text-black">PANACEA</div>
          <nav className="flex gap-8">
            {["Privacy Policy", "Terms of Service", "Research Papers", "Contact"].map((l) => (
              <a key={l} href="#" className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors">{l}</a>
            ))}
          </nav>
          <div className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5e5e5e]">
            © 2025 PANACEA INFECTIOUS DISEASE INSTITUTE.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes drift { from{transform:translate(0,0) scale(1)} to{transform:translate(20px,15px) scale(1.1)} }
      `}</style>
    </div>
  );
}
