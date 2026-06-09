"use client";

import { useEffect, useState, useCallback } from "react";
import { BookingFlow } from "@/components/marketplace/booking-flow";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  BookmarkX,
  Calendar,
  Loader2,
  MapPin,
  Search,
  Star,
  UserCheck,
  UserMinus,
  X
} from "lucide-react";

type Provider = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  category: string;
  location: { label: string; lat: number; lng: number };
  rating: number;
  reviewCount: number;
  verified: boolean;
  distanceKm: number;
  services: Array<{ id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number }>;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ZAR = (c: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

export function AccountProviders({
  savedIds: initialSaved,
  followedIds: initialFollowed,
  userHasAddress = false
}: {
  savedIds: string[];
  followedIds: string[];
  userHasAddress?: boolean;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [locError, setLocError] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [savedSet, setSavedSet] = useState(new Set(initialSaved));
  const [followedSet, setFollowedSet] = useState(new Set(initialFollowed));
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);

  const fetchProviders = useCallback(async (lat: number | null, lng: number | null) => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers/list");
      if (!res.ok) return;
      const data = await res.json();
      let list: Provider[] = data.providers ?? [];
      if (lat !== null && lng !== null) {
        list = list
          .map((p) => ({
            ...p,
            distanceKm: haversineKm(lat, lng, p.location.lat, p.location.lng)
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }
      setProviders(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported. Showing all providers.");
      fetchProviders(null, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        fetchProviders(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocError("Location access denied. Showing all providers.");
        fetchProviders(null, null);
      },
      { timeout: 8000 }
    );
  }, [fetchProviders]);

  async function toggleSave(providerProfileId: string) {
    const res = await fetch("/api/account/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerProfileId, action: "save" })
    });
    const data = await res.json();
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (data.saved) next.add(providerProfileId); else next.delete(providerProfileId);
      return next;
    });
  }

  async function toggleFollow(providerProfileId: string) {
    const res = await fetch("/api/account/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerProfileId, action: "follow" })
    });
    const data = await res.json();
    setFollowedSet((prev) => {
      const next = new Set(prev);
      if (data.followed) next.add(providerProfileId); else next.delete(providerProfileId);
      return next;
    });
  }

  const filtered = providers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.location.label.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Providers near me</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {userLat !== null ? "Sorted by distance from your location" : "Browse available providers"}
        </p>
        {locError && (
          <p className="mt-1 text-xs text-amber-600">{locError}</p>
        )}
      </div>

      {/* Search */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category or city…"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-[var(--muted)]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] py-16 text-center">
          <MapPin className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
          <p className="text-base font-bold text-[var(--muted)]">No providers found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const handle = p.handle.replace("@", "");
            const minPrice = p.services.length ? Math.min(...p.services.map((s) => s.priceCents)) : null;
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white cursor-pointer hover:border-[var(--brand)]/40 transition"
                onClick={() => setSelectedProvider(p)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt={p.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">
                        {p.name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <button className="font-black text-[var(--ink)] hover:underline text-left">
                        {p.name}
                      </button>
                      <p className="text-xs text-[var(--muted)]">{p.category}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {p.rating.toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {p.distanceKm > 0 ? `${p.distanceKm.toFixed(1)} km` : p.location.label}
                        </span>
                        {minPrice !== null && (
                          <span className="font-semibold text-[var(--ink)]">from {ZAR(minPrice)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 border-t border-[var(--line)] pt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedProvider(p); }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] py-2 text-xs font-bold text-white hover:bg-[var(--brand-dark)] transition"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Book
                    </button>
                    <button
                      onClick={() => toggleSave(p.id)}
                      title={savedSet.has(p.id) ? "Unsave" : "Save"}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                        savedSet.has(p.id)
                          ? "border-amber-200 bg-amber-50 text-amber-600"
                          : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--background)]"
                      )}
                    >
                      {savedSet.has(p.id) ? <BookmarkX className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => toggleFollow(p.id)}
                      title={followedSet.has(p.id) ? "Unfollow" : "Follow"}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                        followedSet.has(p.id)
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--background)]"
                      )}
                    >
                      {followedSet.has(p.id) ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Right-side provider panel */}
      <AnimatePresence>
        {selectedProvider && !bookingProvider && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProvider(null)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:max-w-lg"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)]">{selectedProvider.category}</p>
                  <h2 className="text-lg font-black">{selectedProvider.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)] transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {selectedProvider.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedProvider.avatarUrl} alt={selectedProvider.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-xl font-bold">
                        {selectedProvider.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {selectedProvider.rating.toFixed(1)} ({selectedProvider.reviewCount} reviews)
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedProvider.distanceKm > 0 ? `${selectedProvider.distanceKm.toFixed(1)} km` : selectedProvider.location.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Services */}
                  <div className="mt-5">
                    <h3 className="mb-3 text-sm font-black">Services</h3>
                    <div className="space-y-2">
                      {selectedProvider.services.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setBookingProvider(selectedProvider)}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left text-sm hover:border-[var(--brand)]/50 transition"
                        >
                          <span>
                            <span className="block font-bold">{s.name}</span>
                            <span className="text-xs text-[var(--muted)]">{s.durationMinutes} min</span>
                          </span>
                          <span className="text-right">
                            <span className="block font-black">{ZAR(s.priceCents)}</span>
                            <span className="text-xs text-[var(--muted)]">{ZAR(s.depositCents)} deposit</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* CTA */}
              <div className="border-t border-[var(--line)] px-5 py-4">
                <button
                  onClick={() => setBookingProvider(selectedProvider)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-3.5 text-sm font-black text-white hover:bg-[var(--ink)]/90 transition"
                >
                  <Calendar className="h-4 w-4" />
                  Book appointment
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {bookingProvider && (
        <BookingFlow
          open
          onClose={() => { setBookingProvider(null); }}
          providerProfileId={bookingProvider.id}
          providerName={bookingProvider.name}
          services={bookingProvider.services}
          userHasAddress={userHasAddress}
        />
      )}
    </div>
  );
}
