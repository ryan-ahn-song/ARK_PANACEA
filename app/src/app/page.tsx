"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const CORE_SYSTEMS = [
  { icon: "radar", title: "Real-time Infection-Risk", desc: "Visual risk signals from local environmental and symptom data." },
  { icon: "auto_graph", title: "No-Text Education", desc: "Interactive visual symptom mapping for everyone." },
  { icon: "memory", title: "AI Symptom Guidance", desc: "Protected guidance workflow with offline support planned." },
  { icon: "record_voice_over", title: "Voice Guidance", desc: "Intuitive audio-led protocols for immediate care." },
  { icon: "public", title: "Outbreak Monitoring", desc: "Anonymous community health signal tracking." },
];

const REVEAL_ITEMS = [
  { num: "01", title: "Adaptive Risk Signals", desc: "Atlas turns user-selected symptoms and local context into a clearer prevention workflow." },
  { num: "02", title: "Autonomous Prevention", desc: "A shift from reactive medicine to a state of perpetual protection, guided by advanced algorithmic sentinels." },
  { num: "03", title: "Clinical Serenity", desc: "Information is only power when it's peaceful. We filter the noise to provide clarity when it matters most." },
];

export default function LandingPage() {
  const heroImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroImgRef.current) {
        heroImgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Nav */}
      <nav
        className="fixed top-0 w-full z-50 border-b border-[#cfc4c5]"
        style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex justify-between items-center h-20 px-16 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-12">
            <span className="font-serif font-semibold text-2xl tracking-tight text-black">PANACEA</span>
            <div className="hidden md:flex items-center gap-8">
              {[["Risk", "/dashboard"], ["Body Atlas", "/body-atlas"], ["AI Guidance", "/ai-guidance"], ["Heatmap", "/heatmap"]].map(([label, href]) => (
                <Link key={href} href={href}
                  className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] hover:text-black transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/login">
            <button className="bg-black text-white rounded-full px-6 py-2 font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#1b1b1b] transition-colors active:scale-95">
              Join
            </button>
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              ref={heroImgRef}
              src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80"
              alt="Mountain landscape"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(0.2) contrast(0.9) brightness(1.05)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-[#f9f9f9]" />
          </div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-16 w-full flex flex-col items-start gap-8">
            <div className="flex flex-col gap-4">
              <span className="font-sans text-xs font-semibold tracking-[0.4em] uppercase text-black">
                Panacea Digital Health
              </span>
              <h1 className="font-serif font-semibold text-[48px] md:text-[64px] leading-[1.1] tracking-tight max-w-3xl">
                Healthcare <br />
                <span className="italic font-light">Beyond Words.</span>
              </h1>
            </div>
            <div className="flex flex-col md:flex-row md:items-end gap-12 w-full">
              <p className="font-sans text-[36px] font-light leading-[1.1] tracking-[-0.01em] max-w-xl text-[#4c4546]/80">
                Prevent, Protect, Empower. A silent revolution in clinical intelligence and personal longevity.
              </p>
              <div className="flex-grow" />
              <Link href="/login">
                <button
                  className="group flex items-center gap-4 border border-[#cfc4c5] px-8 py-4 rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-black hover:text-white hover:border-black transition-all duration-500"
                  style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)" }}
                >
                  Get Started
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-40">
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-px h-12 bg-black" />
          </div>
        </section>

        {/* Core Systems */}
        <section id="core-systems" className="max-w-[1200px] mx-auto px-16 py-32">
          <div className="mb-16">
            <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">The Ecosystem</span>
            <h2 className="font-serif text-[42px] font-light leading-[1.3] mt-4">Core Systems</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {CORE_SYSTEMS.map((s) => (
              <div key={s.title} className="flex flex-col gap-4 group cursor-default">
                <div className="w-12 h-12 rounded-xl bg-[#f3f3f4] flex items-center justify-center border border-[#cfc4c5] group-hover:bg-black group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <h4 className="font-serif font-medium text-[18px] leading-tight">{s.title}</h4>
                <p className="text-[#5e5e5e] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* No-Text UX / Offline AI */}
        <section className="bg-[#f3f3f4] py-32">
          <div className="max-w-[1200px] mx-auto px-16 grid md:grid-cols-2 gap-20">
            {[
              {
                label: "The Interface", title: "No-Text UX",
                body: "Language should never be a barrier to health. PANACEA utilizes a sophisticated, visual-first interface that replaces dense text with intuitive anatomical mapping and universal iconography.",
                icon: "translate", tag: "Universal Accessibility",
                tagDesc: "Designed for 100% comprehension across all literacy levels and languages.",
              },
              {
                label: "The Core", title: "Offline-first AI",
                body: "Privacy is paramount. This MVP minimizes symptom data, checks access on the server, and keeps the path open for future offline model support.",
                icon: "cloud_off", tag: "Privacy-Aware Guidance",
                tagDesc: "Controlled symptom values and protected API access reduce unnecessary exposure.",
              },
            ].map((block) => (
              <div key={block.title} className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">{block.label}</span>
                  <h2 className="font-serif text-[42px] font-light leading-[1.3]">{block.title}</h2>
                  <p className="font-sans text-base text-[#5e5e5e] leading-relaxed">{block.body}</p>
                </div>
                <div className="p-8 border border-[#cfc4c5] rounded-2xl bg-white/50">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="material-symbols-outlined text-black">{block.icon}</span>
                    <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">{block.tag}</span>
                  </div>
                  <p className="text-sm text-[#5e5e5e]">{block.tagDesc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Insights / Asymmetric */}
        <section className="max-w-[1200px] mx-auto px-16 py-32 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-2/5">
            <div className="md:sticky top-32">
              <h2 className="font-serif text-[42px] font-light leading-[1.3] mb-6">
                Redefining <br />The Horizon.
              </h2>
              <p className="font-sans text-base text-[#5e5e5e] leading-relaxed mb-12">
                We bridge the gap between complex biological data and actionable human intelligence through sophisticated, minimalist interfaces.
              </p>
              <div
                className="p-8 rounded-[40px] flex flex-col gap-6 border border-[#cfc4c5]"
                style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)" }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#5e5e5e] uppercase">Insight.01</span>
                  <span className="material-symbols-outlined text-black">analytics</span>
                </div>
                <div className="h-24 flex items-end gap-2">
                  {[40, 60, 30, 90, 50].map((h, i) => (
                    <div key={i} className="w-full rounded-t-sm" style={{ height: `${h}%`, background: `rgba(0,0,0,${0.1 + i * 0.08})` }} />
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">Predictive Vitality</p>
                  <p className="font-mono text-[10px] text-[#5e5e5e]">Syncing active protocols...</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-3/5 space-y-24 pt-12">
            {REVEAL_ITEMS.map((item) => (
              <RevealItem key={item.num} {...item} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1600&q=80"
              alt="Nature macro"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(0.1)" }}
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="relative z-10 text-center px-16">
            <h2 className="font-serif font-semibold text-[48px] leading-[1.2] tracking-tight text-white mb-8">
              Begin Your Journey.
            </h2>
            <div className="flex justify-center gap-6">
              <Link href="/login">
                <button className="bg-white text-black px-10 py-4 rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-[#e2e2e2] transition-all duration-300 active:scale-95">
                  Register
                </button>
              </Link>
              <a href="#core-systems"
                className="border border-white/50 text-white px-10 py-4 rounded-full font-sans text-xs font-semibold tracking-widest uppercase hover:bg-white/10 transition-all duration-300 inline-block text-center"
                style={{ backdropFilter: "blur(12px)" }}
              >
                Learn More
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-32 bg-[#f9f9f9] border-t border-[#cfc4c5]">
        <div className="max-w-[1200px] mx-auto px-16 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex flex-col gap-6">
            <span className="font-serif italic text-2xl text-black">PANACEA</span>
            <p className="font-sans text-base italic opacity-50 max-w-xs">
              Elevating human potential through clinical foresight and intentional design.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
            {[
              { label: "Platform", links: [["Risk Dashboard", "/dashboard"], ["Body Atlas", "/body-atlas"], ["AI Guidance", "/ai-guidance"], ["Heatmap", "/heatmap"]] },
              { label: "Community", links: [["Guardian", "/guardian"], ["Profile", "/profile"]] },
              { label: "Account", links: [["Login", "/login"]] },
            ].map((col) => (
              <div key={col.label} className="flex flex-col gap-4">
                <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#5e5e5e]">{col.label}</span>
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} className="font-sans text-base text-[#1a1c1c] hover:text-[#5e5e5e] transition-colors">{label}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-16 mt-24 pt-8 border-t border-[#cfc4c5] flex justify-between items-center">
          <p className="font-sans text-xs text-[#5e5e5e]">© 2024 PANACEA Digital Health. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="material-symbols-outlined text-[#5e5e5e] hover:text-black cursor-pointer transition-colors">language</span>
            <span className="material-symbols-outlined text-[#5e5e5e] hover:text-black cursor-pointer transition-colors">share</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function RevealItem({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="group border-t border-[#cfc4c5] pt-8 relative cursor-pointer">
      <div
        className="absolute top-[-1px] left-0 h-[2px] bg-black w-1/3 group-hover:w-full transition-all duration-500 ease-out"
      />
      <div className="flex justify-between items-start mb-4">
        <span className="font-sans text-xs font-semibold tracking-[0.2em] text-[#5e5e5e]">{num}</span>
        <h3 className="font-serif font-medium text-2xl text-right">{title}</h3>
      </div>
      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 overflow-hidden">
        <div className="overflow-hidden">
          <p className="font-sans text-base text-[#5e5e5e] pb-8">{desc}</p>
        </div>
      </div>
    </div>
  );
}
