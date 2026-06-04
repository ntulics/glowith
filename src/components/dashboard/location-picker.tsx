"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";

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

const DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

// Drag the marker (or click) to set an exact location. Calls onChange(lat, lng).
export function LocationPicker({
  lat, lng, onChange
}: {
  lat: number; lng: number; onChange: (lat: number, lng: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: lat || -26.2041, lng: lng || 28.0473 // default: Johannesburg
  });

  useEffect(() => { loadLeaflet().then(() => setReady(true)).catch(() => {}); }, []);

  useEffect(() => {
    if (!ready || !elRef.current || mapRef.current) return;
    const L = (window as any).L;
    const start: [number, number] = [coords.lat, coords.lng];
    const map = L.map(elRef.current, { attributionControl: false }).setView(start, lat || lng ? 15 : 11);
    mapRef.current = map;

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    L.tileLayer(dark ? DARK : LIGHT, { maxZoom: 19 }).addTo(map);

    const pin = L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
        <span style="width:18px;height:18px;background:#D94472;border:3px solid white;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>
      </div>`,
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
    const marker = L.marker(start, { draggable: true, icon: pin }).addTo(map);
    markerRef.current = marker;

    const update = (latlng: any) => {
      const c = { lat: latlng.lat, lng: latlng.lng };
      setCoords(c);
      onChange(c.lat, c.lng);
    };
    marker.on("dragend", () => update(marker.getLatLng()));
    map.on("click", (e: any) => { marker.setLatLng(e.latlng); update(e.latlng); });

    setTimeout(() => map.invalidateSize(), 100); // ensure correct sizing in a tab/panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      onChange(c.lat, c.lng);
      if (markerRef.current && mapRef.current) {
        markerRef.current.setLatLng([c.lat, c.lng]);
        mapRef.current.setView([c.lat, c.lng], 16);
      }
    });
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-gray-200">
        <div ref={elRef} className="h-64 w-full bg-gray-50" />
        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">Drag the pin or tap the map to set your exact spot.</p>
        <button type="button" onClick={useMyLocation}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600 hover:border-[#D94472] hover:text-[#D94472]">
          <Crosshair className="h-3.5 w-3.5" /> Use my location
        </button>
      </div>
    </div>
  );
}
