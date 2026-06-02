import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]",
        className
      )}
      {...props}
    />
  );
}
