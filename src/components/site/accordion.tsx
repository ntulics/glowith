"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type AccordionItem = { q: string; a: React.ReactNode };

export function Accordion({ items, defaultOpen }: { items: AccordionItem[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen ?? null);
  return (
    <div className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
              <span className="font-bold">{item.q}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="px-5 pb-5 text-sm leading-7 text-[var(--muted)]">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}
