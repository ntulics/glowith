import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Verification mark with colour + tooltip indicating who verified the provider.
 *  - GLOWITH  → blue check, "Verified by Glowith"
 *  - EMPLOYER → emerald check, "Verified by {employerName}"
 */
export function VerifiedBadge({
  verifiedBy,
  employerName,
  className,
  withLabel = false
}: {
  verifiedBy?: "GLOWITH" | "EMPLOYER" | null;
  employerName?: string | null;
  className?: string;
  withLabel?: boolean;
}) {
  if (!verifiedBy) return null;

  const isGlowith = verifiedBy === "GLOWITH";
  const title = isGlowith ? "Verified by Glowith" : `Verified by ${employerName ?? "employer"}`;
  const color = isGlowith ? "text-[#3B82F6]" : "text-emerald-500";

  if (withLabel) {
    return (
      <span
        title={title}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
          isGlowith ? "bg-blue-50 text-[#3B82F6]" : "bg-emerald-50 text-emerald-600",
          className
        )}
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        {isGlowith ? "Verified" : "Verified by employer"}
      </span>
    );
  }

  return (
    <span title={title} className="inline-flex cursor-help">
      <BadgeCheck className={cn("h-4 w-4", color, className)} aria-label={title} />
    </span>
  );
}
