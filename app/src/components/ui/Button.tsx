"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-sans font-semibold tracking-widest uppercase transition-all duration-200 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-[#000] text-white hover:bg-[#1b1b1b]",
      ghost: "bg-white text-[#000] border border-[#cfc4c5] hover:border-[#000]",
      outline: "bg-transparent text-[#000] border border-[#000] hover:bg-[#000] hover:text-white",
    };

    const sizes = {
      sm: "px-4 py-2 text-[10px]",
      md: "px-6 py-3 text-[11px]",
      lg: "px-8 py-4 text-xs",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
