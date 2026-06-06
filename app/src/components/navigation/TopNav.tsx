"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "Risk", href: "/dashboard" },
  { label: "Body Atlas", href: "/body-atlas" },
  { label: "AI Guidance", href: "/ai-guidance" },
  { label: "Heatmap", href: "/heatmap" },
  { label: "Guardian", href: "/guardian" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-8 h-14 bg-[#f9f9f9]/90 backdrop-blur-sm border-b border-[#e8e8e8]">
      <Link href="/" className="font-serif font-semibold text-sm tracking-widest text-[#000] uppercase">
        PANACEA
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-sans text-xs tracking-wide transition-colors ${
              pathname === link.href
                ? "text-[#000] font-semibold"
                : "text-[#5e5e5e] hover:text-[#000]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <Link href="/profile">
        <Button size="sm">Profile</Button>
      </Link>
    </nav>
  );
}
