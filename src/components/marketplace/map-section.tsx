"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Clock3, X, Loader2 } from "lucide-react";

type Svc = { id: string; name: string; durationMinutes: number; priceCents: number };
type P = {
  id: string; handle: string; businessName: string; category: string;
  location: { lat: number; lng: number; label: string }; services: Svc[];
};

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Load Leaflet from CDN once
let leafletPromise: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.body.appendChild(s);
  });
  return leafletPromise;
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export function MapSection({ providers, user }: { providers: P[]; user: { lat: number; lng: number; label: string } }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<P | null>(null);

  // Only providers with real coordinates can be pinned
  const pinned = useMemo(
    () => providers.filter((p) => p.location.lat !== 0 || p.location.lng !== 0),
    [providers]
  );

  useEffect(() => { loadLeaflet().then(() => setReady(true)).catch(() => {}); }, []);

  // Init map
  useEffect(() => {
    if (!ready || !elRef.current || mapRef.current) return;
    const L = (window as any).L;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false })
      .setView([user.lat, user.lng], 12);
    mapRef.current = map;

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    tileRef.current = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, { maxZoom: 19 }).addTo(map);

    // React to system theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onTheme = (e: MediaQueryListEvent) => {
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(e.matches ? DARK_TILES : LIGHT_TILES, { maxZoom: 19 }).addTo(map);
    };
    mq.addEventListener("change", onTheme);
    return () => mq.removeEventListener("change", onTheme);
  }, [ready, user.lat, user.lng]);

  // Recenter when the user's location changes
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([user.lat, user.lng]);
  }, [user.lat, user.lng]);

  // (Re)draw markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    const map = mapRef.current;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // User location
    const userIcon = L.divIcon({
      className: "",
      html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,.3)"></span>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
    markersRef.current.push(L.marker([user.lat, user.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map).bindTooltip("You're here"));

    // Provider pins with distance label
    let nearMaxKm = 0; // farthest *nearby* studio, used to pick the zoom
    pinned.forEach((p) => {
      const dist = haversineKm(user.lat, user.lng, p.location.lat, p.location.lng);
      if (dist <= 25) nearMaxKm = Math.max(nearMaxKm, dist);
      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <span style="background:#D94472;color:white;font-size:10px;font-weight:800;padding:2px 6px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)">${dist.toFixed(1)} km</span>
          <span style="width:14px;height:14px;background:#D94472;border:2px solid white;border-radius:9999px;margin-top:2px;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>
        </div>`,
        iconSize: [60, 34], iconAnchor: [30, 34]
      });
      const m = L.marker([p.location.lat, p.location.lng], { icon: pinIcon }).addTo(map);
      m.on("click", () => setSelected(p));
      markersRef.current.push(m);
    });

    // Focus on the user, zoomed to fit the nearby studios (ignoring far outliers).
    if (nearMaxKm > 0) {
      const km = Math.min(nearMaxKm * 1.4 + 0.5, 25); // a little padding, capped
      const dLat = km / 111;
      const dLng = km / (111 * Math.cos((user.lat * Math.PI) / 180) || 1);
      try {
        map.fitBounds(
          [[user.lat - dLat, user.lng - dLng], [user.lat + dLat, user.lng + dLng]],
          { padding: [40, 40], maxZoom: 16 }
        );
      } catch { map.setView([user.lat, user.lng], 14); }
    } else {
      // No studios nearby — just centre on the user at a sensible zoom
      map.setView([user.lat, user.lng], 13);
    }
  }, [ready, pinned, user.lat, user.lng]);

  return (
    <section className="relative mt-10">
      <div className="mx-auto mb-4 max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-black">Studios on the map</h2>
        <p className="text-sm text-[var(--muted)]">{pinned.length} near {user.label}</p>
      </div>

      <div className="relative">
        {/* Edge-to-edge map */}
        <div ref={elRef} className="h-[460px] w-full sm:h-[560px] z-0" style={{ background: "var(--background)" }} />
        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
          </div>
        )}

        {/* Selected business popup card */}
        {selected && (
          <MapPopupCard
            provider={selected}
            distanceKm={haversineKm(user.lat, user.lng, selected.location.lat, selected.location.lng)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </section>
  );
}

function MapPopupCard({ provider, distanceKm, onClose }: { provider: P; distanceKm: number; onClose: () => void }) {
  const [slots, setSlots] = useState<string[] | null>(null);

  useEffect(() => {
    // Next free slots today (08:00–18:00, hourly), minus busy + past
    const today = new Date();
    const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${provider.id}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => {
        const busy: { start: string; durationMinutes: number }[] = d.busy ?? [];
        const free: string[] = [];
        for (let h = 8; h <= 17 && free.length < 4; h++) {
          const slot = new Date(today); slot.setHours(h, 0, 0, 0);
          if (slot.getTime() < Date.now()) continue;
          const clash = busy.some((b) => {
            const bs = new Date(b.start).getTime(), be = bs + b.durationMinutes * 60000;
            return slot.getTime() < be && slot.getTime() + 3600000 > bs;
          });
          if (!clash) free.push(`${String(h).padStart(2, "0")}:00`);
        }
        setSlots(free);
      })
      .catch(() => setSlots([]));
  }, [provider.id]);

  const topServices = provider.services.slice(0, 3);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-black">{provider.businessName}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
            <MapPin className="h-3 w-3" />{provider.category} · {distanceKm.toFixed(1)} km away
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]"><X className="h-4 w-4" /></button>
      </div>

      {topServices.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {topServices.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{s.name}</span>
              <span className="font-bold">{ZAR(s.priceCents)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Available today</p>
        {slots === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
        ) : slots.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {slots.map((t) => (
              <a key={t} href={`/provider/${provider.handle.replace("@", "")}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-bold hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Clock3 className="h-3 w-3" />{t}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)]">No free slots today — see the profile for more dates.</p>
        )}
      </div>

      <a href={`/provider/${provider.handle.replace("@", "")}`}
        className="mt-4 block w-full rounded-xl bg-[var(--ink)] py-2.5 text-center text-sm font-bold text-white hover:bg-[var(--ink)]/90">
        View &amp; book
      </a>
    </div>
  );
}
