"use client";

import dynamic from "next/dynamic";

const HeatmapClient = dynamic(() => import("@/components/heatmap/HeatmapClient"), { ssr: false });

export default function HeatmapPage() {
  return <HeatmapClient />;
}
