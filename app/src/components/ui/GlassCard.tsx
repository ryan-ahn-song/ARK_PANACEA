import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: "md" | "xl" | "full";
}

export default function GlassCard({ rounded = "xl", className = "", children, ...props }: GlassCardProps) {
  const radii = { md: "rounded-[12px]", xl: "rounded-[20px]", full: "rounded-full" };

  return (
    <div
      className={`glass-card ${radii[rounded]} p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
