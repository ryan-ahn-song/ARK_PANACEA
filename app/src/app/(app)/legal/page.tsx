"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Section = {
  id: string;
  part: "terms" | "privacy";
  title: string;
};

const SECTIONS: Section[] = [
  { id: "terms-acceptance",    part: "terms",   title: "Acceptance of Terms" },
  { id: "terms-disclaimer",    part: "terms",   title: "Medical Disclaimer" },
  { id: "terms-scope",         part: "terms",   title: "Scope of Services" },
  { id: "terms-conduct",       part: "terms",   title: "Rules of Conduct" },
  { id: "terms-liability",     part: "terms",   title: "Limitation of Liability" },
  { id: "terms-governing",     part: "terms",   title: "Governing Law" },
  { id: "privacy-commitment",  part: "privacy", title: "Privacy-by-Design" },
  { id: "privacy-pii",         part: "privacy", title: "Non-Collection of PII" },
  { id: "privacy-ondevice",    part: "privacy", title: "On-Device AI Processing" },
  { id: "privacy-pipeline",    part: "privacy", title: "Anonymization Pipeline" },
  { id: "privacy-security",    part: "privacy", title: "Data Security" },
  { id: "privacy-contact",     part: "privacy", title: "Contact" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LegalPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  // Track which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <main className="max-w-[1200px] mx-auto px-8 md:px-16 pt-32 pb-32">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header className="mb-20 border-b border-[#cfc4c5] pb-16">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e] hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back
            </Link>
            <span className="text-[#cfc4c5]">/</span>
            <span className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#5e5e5e]">
              Legal
            </span>
          </div>

          <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] block mb-4">
            PANACEA Platform
          </span>
          <h1 className="font-serif font-semibold text-[56px] leading-[1.1] tracking-tight mb-6">
            Terms of Use &<br />
            <span className="font-light italic">Privacy Policy</span>
          </h1>
          <div className="flex flex-wrap gap-6 items-center">
            <span className="font-mono text-xs text-[#5e5e5e] uppercase tracking-widest">
              Last Updated: June 2026
            </span>
            <span className="text-[#cfc4c5]">·</span>
            <span className="font-mono text-xs text-[#5e5e5e] uppercase tracking-widest">
              Governing Law: Republic of Korea
            </span>
            <span className="text-[#cfc4c5]">·</span>
            <a
              href="https://github.com/Quackk08/ARK_PANACEA"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-black underline hover:text-[#5e5e5e] transition-colors uppercase tracking-widest"
            >
              Team ARK · GitHub ↗
            </a>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-16">

          {/* ── Sticky Table of Contents ────────────────────────────────────── */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-28 space-y-1">
              <p className="font-sans text-[9px] font-semibold tracking-[0.25em] uppercase text-[#5e5e5e] mb-4 px-3">
                Contents
              </p>

              {/* Part 1 */}
              <p className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-black px-3 pt-2 pb-1">
                Part 1 — Terms of Use
              </p>
              {SECTIONS.filter((s) => s.part === "terms").map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-sans text-xs transition-all ${
                    active === s.id
                      ? "bg-black text-white font-semibold"
                      : "text-[#5e5e5e] hover:text-black hover:bg-[#f0f0f0]"
                  }`}
                >
                  {s.title}
                </button>
              ))}

              {/* Part 2 */}
              <p className="font-sans text-[9px] font-semibold tracking-[0.2em] uppercase text-black px-3 pt-4 pb-1">
                Part 2 — Privacy Policy
              </p>
              {SECTIONS.filter((s) => s.part === "privacy").map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-sans text-xs transition-all ${
                    active === s.id
                      ? "bg-black text-white font-semibold"
                      : "text-[#5e5e5e] hover:text-black hover:bg-[#f0f0f0]"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <article className="flex-1 min-w-0 space-y-24">

            {/* ════════════════════════════════════════════════════════════════
                PART 1 — TERMS OF USE
            ════════════════════════════════════════════════════════════════ */}
            <div>
              <div className="flex items-center gap-4 mb-12">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: "16px" }}>
                    gavel
                  </span>
                </div>
                <h2 className="font-serif text-[36px] font-light">Part 1: Terms of Use</h2>
              </div>

              {/* Section 1 */}
              <LegalSection
                id="terms-acceptance"
                num="1"
                title="Acceptance of Terms"
              >
                <p>
                  By accessing or using the PANACEA Web Application (accessible at{" "}
                  <a href="https://panaceaforall.kro.kr" target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-[#5e5e5e] transition-colors">
                    https://panaceaforall.kro.kr
                  </a>
                  ), you agree to be bound by these Terms of Use. If you do not agree to these terms,
                  please do not access or use the platform.
                </p>
                <KoreanNote>
                  본 웹 앱(https://panaceaforall.kro.kr)을 이용함으로써 귀하는 본 이용약관에 동의하게 됩니다. 동의하지 않으실 경우 서비스를 이용하실 수 없습니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 2 */}
              <LegalSection
                id="terms-disclaimer"
                num="2"
                title="Medical Disclaimer"
                badge={{ text: "Critical", color: "#ba1a1a" }}
              >
                <p className="font-semibold mb-3">NO MEDICAL DIAGNOSIS OR CLINICAL TREATMENT:</p>
                <p className="mb-4">
                  PANACEA is designed solely for educational, preventive, and community health
                  monitoring purposes. The AI-guided symptom analysis and visual guides do not
                  constitute medical diagnosis, professional clinical advice, or treatment plans.
                </p>
                <p className="font-semibold mb-3">SEEK PROFESSIONAL HELP:</p>
                <p>
                  Always consult a qualified medical professional or visit your local clinic for
                  any health concerns. Never disregard professional medical advice or delay seeking
                  it because of information presented on PANACEA.
                </p>
                <KoreanNote>
                  PANACEA는 교육용 및 보건 예방 모니터링 플랫폼입니다. AI 기반 증상 분석 및 시각 가이드는 의사의 진단이나 전문적인 의료 조언을 대체할 수 없습니다. 모든 건강 이상 증세는 반드시 전문 의료 기관 및 의사와 상의하십시오.
                </KoreanNote>
              </LegalSection>

              {/* Section 3 */}
              <LegalSection id="terms-scope" num="3" title="Scope of Services">
                <p className="mb-4">
                  As outlined in the e-ICON proposal, PANACEA provides:
                </p>
                <ul className="space-y-3">
                  {[
                    "Visual, touch-based health education interfaces (The Body Atlas).",
                    "Offline-first, on-device AI symptom analysis using TensorFlow.js.",
                    "Dynamic voice and color-guided accessibility features.",
                    "A localized community outbreak alert system (Heatmaps).",
                    "Gamified prevention incentives (The Guardian Challenge) redeemable through local NGO partnerships.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <KoreanNote>
                  본 서비스는 비텍스트(No-Text) 기반의 신체 아틀라스 교육, TensorFlow.js를 활용한 온디바이스 AI 증상 모니터링, 그리고 익명 지역별 발병 히트맵 서비스를 제공합니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 4 */}
              <LegalSection id="terms-conduct" num="4" title="Rules of Conduct">
                <p className="mb-4">
                  Users agree to use PANACEA responsibly and in good faith. You shall not:
                </p>
                <ul className="space-y-3">
                  {[
                    "Attempt to feed false, mass-generated data to manipulate the localized symptom heatmap.",
                    "Reverse-engineer, disable, or tamper with the security, anonymization pipelines, or local offline databases (IndexedDB/localStorage) of the app.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </LegalSection>

              {/* Section 5 */}
              <LegalSection id="terms-liability" num="5" title="Limitation of Liability">
                <p>
                  PANACEA is developed by Team ARK for the 16th e-ICON World Contest and is provided
                  on an <strong>"as-is"</strong> and <strong>"as-available"</strong> basis. To the
                  maximum extent permitted by applicable law, Team ARK, its team members, and
                  Daejeon Daeshin High School are not liable for any direct, indirect, incidental,
                  or consequential damages resulting from the use or inability to use this platform.
                </p>
                <KoreanNote>
                  본 앱은 제16회 e-ICON 세계대회 참가를 위해 개발된 프로토타입으로 "있는 그대로" 제공됩니다. 개발진(Team ARK) 및 학교는 본 앱의 사용으로 인해 발생하는 직간접적 손해에 대해 법적 책임을 지지 않습니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 6 */}
              <LegalSection id="terms-governing" num="6" title="Governing Law">
                <p>
                  These terms are governed by and construed in accordance with the laws of the
                  Republic of Korea.
                </p>
              </LegalSection>
            </div>

            <div className="border-t border-[#cfc4c5]" />

            {/* ════════════════════════════════════════════════════════════════
                PART 2 — PRIVACY POLICY
            ════════════════════════════════════════════════════════════════ */}
            <div>
              <div className="flex items-center gap-4 mb-12">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>
                    lock
                  </span>
                </div>
                <h2 className="font-serif text-[36px] font-light">Part 2: Privacy Policy</h2>
              </div>

              {/* Section 1 */}
              <LegalSection id="privacy-commitment" num="1" title="Privacy-by-Design Commitment">
                <p>
                  At PANACEA, we believe that health data is deeply personal. In alignment with the
                  architecture detailed in the e-ICON proposal, our platform is built from the ground
                  up to respect your anonymity. We do not require account creation, email
                  verification, or login credentials.
                </p>
                <KoreanNote>
                  PANACEA는 사용자의 개인정보를 최우선으로 보호합니다. 회원가입, 로그인, 이메일 등의 식별 정보를 전혀 요구하지 않습니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 2 */}
              <LegalSection id="privacy-pii" num="2" title="Non-Collection of Personal Identifiable Information (PII)">
                <ul className="space-y-3 mb-4">
                  {[
                    "We do not collect, store, or share names, email addresses, phone numbers, static IP addresses, or device identifiers.",
                    "All core functions, including AI symptom evaluations, are accessible without revealing your identity.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#50a14f] mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <KoreanNote>
                  이름, 연락처, 정적 IP, 고유 디바이스 ID 등 개인을 식별할 수 있는 정보를 일절 수집하지 않습니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 3 */}
              <LegalSection id="privacy-ondevice" num="3" title="On-Device AI Processing (Zero Server Transmission of Raw Data)">
                <ul className="space-y-3">
                  {[
                    "Your symptom assessments are processed entirely on your device using TensorFlow.js.",
                    "Raw individual symptom selections are kept in your browser's temporary storage (IndexedDB / localStorage) and are never transmitted to our external servers (Firebase/Supabase).",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#50a14f] mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <KoreanNote>
                  입력된 증상 데이터는 TensorFlow.js를 통해 사용자 기기 내에서만 처리됩니다. 원본 증상 기록은 외부 서버로 전송되지 않으며, 오직 브라우저 내부 저장소(IndexedDB / localStorage)에 안전하게 임시 보관됩니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 4 */}
              <LegalSection id="privacy-pipeline" num="4" title="Three-Step Anonymization Pipeline for Community Heatmaps">
                <p className="mb-6">
                  To build community resilience and alert local networks to outbreak risks, PANACEA
                  synchronizes symptom occurrences using a rigorous three-step anonymization pipeline:
                </p>
                <div className="space-y-4">
                  {[
                    {
                      step: "Step 1",
                      title: "On-Device De-identification",
                      desc: "All hardware and network identifiers are completely stripped from the symptom signal on the client side.",
                      icon: "phonelink_erase",
                    },
                    {
                      step: "Step 2",
                      title: "Neighborhood-Level Aggregation",
                      desc: "Individual locations are aggregated strictly to broader municipal or village levels (no precise GPS coordinates are ever transmitted).",
                      icon: "location_city",
                    },
                    {
                      step: "Step 3",
                      title: "Density-Only Heatmap Mapping",
                      desc: "Collected data is displayed only as a heat density overlay on the interactive map — never as individual dots or specific markers that could compromise single-user privacy.",
                      icon: "blur_on",
                    },
                  ].map(({ step, title, desc, icon }, i, arr) => (
                    <div key={step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-white"
                            style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>
                            {icon}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 bg-[#e2e2e2] mt-2" style={{ minHeight: "2rem" }} />
                        )}
                      </div>
                      <div className="pb-6">
                        <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest block mb-1">
                          {step}
                        </span>
                        <p className="font-serif font-medium text-lg mb-2">{title}</p>
                        <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <KoreanNote>
                  히트맵 데이터는 다음의 3단계 익명화를 거칩니다: ① 기기 내 식별자 완전 제거, ② 특정 GPS 좌표가 아닌 동/읍/면 단위 데이터 병합, ③ 개인 위치 대신 전체 혼잡도(밀도) 패턴으로만 시각화합니다.
                </KoreanNote>
              </LegalSection>

              {/* Section 5 */}
              <LegalSection id="privacy-security" num="5" title="Data Security">
                <p>
                  We employ industry-standard secure cloud services for community-level data
                  syncing. Since we hold no personal data or decryption keys for local storage,
                  data breaches cannot result in the exposure of your identity or personal health
                  history.
                </p>
              </LegalSection>

              {/* Section 6 */}
              <LegalSection id="privacy-contact" num="6" title="Contact Information">
                <p className="mb-4">
                  For questions regarding these policies, please reach out to Team ARK via the
                  official GitHub repository:
                </p>
                <a
                  href="https://github.com/Quackk08/ARK_PANACEA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 border border-black rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-black hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  github.com/Quackk08/ARK_PANACEA
                </a>
              </LegalSection>
            </div>

            {/* ── Back to app ────────────────────────────────────────────────── */}
            <div className="pt-8 border-t border-[#cfc4c5] flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="font-sans text-xs text-[#5e5e5e] uppercase tracking-widest">
                © 2026 PANACEA — Team ARK · 16th e-ICON World Contest
              </p>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-sans text-xs font-semibold tracking-widest uppercase text-black hover:text-[#5e5e5e] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to Dashboard
              </Link>
            </div>

          </article>
        </div>
      </main>
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function LegalSection({
  id, num, title, badge, children,
}: {
  id: string;
  num: string;
  title: string;
  badge?: { text: string; color: string };
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-[#cfc4c5] pt-10 pb-4">
      <div className="flex items-start gap-4 mb-6">
        <span className="font-mono text-[10px] text-[#5e5e5e] uppercase tracking-widest mt-2 flex-shrink-0 w-4">
          {num}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-serif font-medium text-2xl">{title}</h3>
          {badge && (
            <span
              className="px-2 py-0.5 rounded-full font-sans text-[9px] font-semibold tracking-widest uppercase text-white"
              style={{ background: badge.color }}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
      <div className="ml-8 font-sans text-base text-[#4c4546] leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}

function KoreanNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 p-4 bg-[#f3f3f4] border-l-2 border-[#cfc4c5] rounded-r-xl">
      <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-1">
        국문 요약 (참고용)
      </p>
      <p className="font-sans text-sm text-[#5e5e5e] leading-relaxed">{children}</p>
    </div>
  );
}
