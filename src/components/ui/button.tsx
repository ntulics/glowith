import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "icon";
};

const variants = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] shadow-sm",
  secondary: "bg-[var(--ink)] text-white hover:bg-black",
  ghost: "bg-transparent text-[var(--ink)] hover:bg-black/5",
  outline: "border border-[var(--line)] bg-white/80 text-[var(--ink)] hover:bg-white"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  icon: "h-10 w-10 p-0"
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
