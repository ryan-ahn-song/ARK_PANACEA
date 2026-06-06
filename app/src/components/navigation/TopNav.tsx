"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Risk",        href: "/dashboard"  },
  { label: "Body Atlas",  href: "/body-atlas"  },
  { label: "AI Guidance", href: "/ai-guidance" },
  { label: "Heatmap",     href: "/heatmap"     },
  { label: "Guardian",    href: "/guardian"    },
];

export default function TopNav() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [open, setOpen]         = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });

    // Keep in sync with sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-8 h-14 bg-[#f9f9f9]/90 backdrop-blur-sm border-b border-[#e8e8e8]">
        <Link
          href="/"
          className="font-serif font-semibold text-sm tracking-widest text-[#000] uppercase"
          onClick={() => setOpen(false)}
        >
          PANACEA
        </Link>

        {/* Desktop links */}
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

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link href="/profile" className="hidden md:block">
              <Button size="sm">Profile</Button>
            </Link>
          ) : (
            <Link href="/login" className="hidden md:block">
              <Button size="sm">Login</Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8 p-1"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span
              className={`block h-[1.5px] bg-black rounded-full transition-all duration-300 ${
                open ? "rotate-45 translate-y-[6.5px]" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] bg-black rounded-full transition-all duration-300 ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] bg-black rounded-full transition-all duration-300 ${
                open ? "-rotate-45 -translate-y-[6.5px]" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-[9998] transition-all duration-300 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        {/* Slide-down panel */}
        <div
          className={`absolute top-14 left-0 right-0 bg-[#f9f9f9] border-b border-[#e8e8e8] transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          <div className="px-8 py-6 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-black text-white font-semibold"
                    : "text-[#1a1c1c] hover:bg-[#f0f0f0]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[#e8e8e8] mt-3 pt-3">
              {loggedIn ? (
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm text-[#1a1c1c] hover:bg-[#f0f0f0] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  Profile
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm text-[#1a1c1c] hover:bg-[#f0f0f0] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
