"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/navigation/TopNav";
import Footer from "@/components/navigation/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname === "/heatmap";

  return (
    <>
      <TopNav />
      <main className="min-h-screen pt-14">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}
