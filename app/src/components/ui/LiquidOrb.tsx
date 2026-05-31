interface LiquidOrbProps {
  size?: number;
  className?: string;
}

export default function LiquidOrb({ size = 48, className = "" }: LiquidOrbProps) {
  return (
    <div
      className={`liquid-orb rounded-full bg-gradient-to-br from-[#e2e2e2] to-[#c6c6c6] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
