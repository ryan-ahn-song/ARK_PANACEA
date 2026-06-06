import Link from "next/link";

const FOOTER_LINKS = {
  System: [
    { label: "Risk Matrix", href: "/dashboard" },
    { label: "Body Atlas", href: "/body-atlas" },
    { label: "Guardian Ops", href: "/guardian" },
  ],
  Legal: [
    { label: "Privacy", href: "/legal#privacy-commitment" },
    { label: "Terms",   href: "/legal#terms-acceptance"  },
    { label: "Ethical AI", href: "/legal#terms-disclaimer" },
  ],
  Connect: [
    { label: "Contact", href: "/legal#privacy-contact" },
    { label: "GitHub",  href: "https://github.com/Quackk08/ARK_PANACEA" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-[#e8e8e8] bg-[#f9f9f9] px-8 py-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <p className="font-serif italic text-2xl font-light text-[#1a1c1c] leading-tight mb-2">
              PANACEA
            </p>
            <p className="font-serif italic text-sm text-[#5e5e5e] leading-relaxed">
              Precision Health. Global Resilience.
            </p>
          </div>

          <div className="flex gap-16">
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-[#5e5e5e] mb-4">
                  {category}
                </p>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="font-sans text-xs text-[#1a1c1c] hover:text-[#5e5e5e] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#e8e8e8] flex items-center justify-between">
          <p className="font-sans text-[10px] text-[#7e7576]">
            © 2026 PANACEA Digital Health · Team ARK. All rights reserved.
          </p>
          <p className="font-sans text-[10px] text-[#7e7576]">
            SECURED BY PROTOCOL v1
          </p>
        </div>
      </div>
    </footer>
  );
}
