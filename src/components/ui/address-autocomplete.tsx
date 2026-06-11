"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = { display_name: string; lat: string; lon: string };

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 3) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&addressdetails=1&limit=5&countrycodes=za`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
  }

  function handleSelect(s: Suggestion) {
    onChange(s.display_name);
    setSuggestions([]);
    setOpen(false);
    onSelect?.({ address: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#D94472] focus:bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#D94472]" />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D94472]" />
                <span className="line-clamp-2 text-gray-700">{s.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
