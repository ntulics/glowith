"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function VerifiedBadge({
  verifiedBy,
  employerName,
  className,
  withLabel = false,
}: {
  verifiedBy?: "GLOWITH" | "EMPLOYER" | null;
  employerName?: string | null;
  className?: string;
  withLabel?: boolean;
}) {
  if (!verifiedBy) return null;

  const isGlowith = verifiedBy === "GLOWITH";
  const label = isGlowith ? "Verified by Glowith" : `Verified by ${employerName ?? "employer"}`;
  const sublabel = isGlowith
    ? "This provider has been reviewed and approved by the Glowith team."
    : `This provider's employment has been confirmed by ${employerName ?? "their employer"}.`;
  const color = isGlowith ? "text-[#3B82F6]" : "text-emerald-500";
  const bgColor = isGlowith ? "bg-blue-50 border-blue-100" : "bg-emerald-50 border-emerald-100";
  const textColor = isGlowith ? "text-[#3B82F6]" : "text-emerald-700";

  if (withLabel) {
    return (
      <Tooltip label={label} sublabel={sublabel} isGlowith={isGlowith}>
        <span
          className={cn(
            "inline-flex cursor-default items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            isGlowith ? "bg-blue-50 text-[#3B82F6]" : "bg-emerald-50 text-emerald-600",
            className
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {isGlowith ? "Verified by Glowith" : "Verified by employer"}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={label} sublabel={sublabel} isGlowith={isGlowith}>
      <span className={cn("inline-flex cursor-default", className)}>
        <BadgeCheck className={cn("h-5 w-5", color)} aria-label={label} />
      </span>
    </Tooltip>
  );
}

function Tooltip({
  children,
  label,
  sublabel,
  isGlowith,
}: {
  children: React.ReactNode;
  label: string;
  sublabel: string;
  isGlowith: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-xl border p-3 shadow-lg",
            isGlowith ? "bg-blue-50 border-blue-100" : "bg-emerald-50 border-emerald-100"
          )}
          role="tooltip"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck
              className={cn("h-3.5 w-3.5 shrink-0", isGlowith ? "text-[#3B82F6]" : "text-emerald-600")}
            />
            <span
              className={cn(
                "text-xs font-black",
                isGlowith ? "text-[#3B82F6]" : "text-emerald-700"
              )}
            >
              {label}
            </span>
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-gray-600">{sublabel}</span>
          {/* Arrow */}
          <span
            className={cn(
              "absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r",
              isGlowith ? "bg-blue-50 border-blue-100" : "bg-emerald-50 border-emerald-100"
            )}
          />
        </span>
      )}
    </span>
  );
}
