"use client";

import { useEffect, useState } from "react";
import { BookingFlow } from "@/components/marketplace/booking-flow";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Heart,
  Loader2,
  MapPin,
  Star,
  UserCheck,
  UserMinus,
  Bookmark,
  BookmarkX
} from "lucide-react";

type Provider = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  category: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  services: Array<{ id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number }>;
};

type Tab = "saved" | "followed";

const ZAR = (c: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

function ProviderCard({
  provider,
  isSaved,
  isFollowed,
  onToggleSave,
  onToggleFollow,
  onBook
}: {
  provider: Provider;
  isSaved: boolean;
  isFollowed: boolean;
  onToggleSave: (id: string) => void;
  onToggleFollow: (id: string) => void;
  onBook: (p: Provider) => void;
}) {
  const handle = provider.handle.replace("@", "");
  const minPrice = provider.services.length
    ? Math.min(...provider.services.map((s) => s.priceCents))
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {provider.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={provider.avatarUrl} alt={provider.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">
              {provider.name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <a href={`/provider/${handle}`} target="_blank" rel="noopener noreferrer" className="font-black text-[var(--ink)] hover:underline">
              {provider.name}
            </a>
            <p className="text-xs text-[var(--muted)]">{provider.category}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {provider.rating.toFixed(1)} ({provider.reviewCount})
              </span>
              {provider.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {provider.city}
                </span>
              )}
              {minPrice !== null && (
                <span className="font-semibold text-[var(--ink)]">from {ZAR(minPrice)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 border-t border-[var(--line)] pt-3">
          <button
            onClick={() => onBook(provider)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] py-2 text-xs font-bold text-white hover:bg-[var(--brand-dark)] transition"
          >
            <Calendar className="h-3.5 w-3.5" />
            Book
          </button>
          <button
            onClick={() => onToggleSave(provider.id)}
            title={isSaved ? "Remove from saved" : "Save"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition",
              isSaved
                ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--background)]"
            )}
          >
            {isSaved ? <BookmarkX className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onToggleFollow(provider.id)}
            title={isFollowed ? "Unfollow" : "Follow"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition",
              isFollowed
                ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--background)]"
            )}
          >
            {isFollowed ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccountFavourites({ userId }: { userId: string }) {
  const [saved, setSaved] = useState<Provider[]>([]);
  const [followed, setFollowed] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("saved");
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/favourites");
      if (!res.ok) return;
      const data = await res.json();
      setSaved(data.saved ?? []);
      setFollowed(data.followed ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleSave(providerProfileId: string) {
    const res = await fetch("/api/account/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerProfileId, action: "save" })
    });
    const data = await res.json();
    if (!data.saved) {
      setSaved((prev) => prev.filter((p) => p.id !== providerProfileId));
    } else {
      await load();
    }
  }

  async function toggleFollow(providerProfileId: string) {
    const res = await fetch("/api/account/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerProfileId, action: "follow" })
    });
    const data = await res.json();
    if (!data.followed) {
      setFollowed((prev) => prev.filter((p) => p.id !== providerProfileId));
    } else {
      await load();
    }
  }

  const savedSet = new Set(saved.map((p) => p.id));
  const followedSet = new Set(followed.map((p) => p.id));

  const displayed = tab === "saved" ? saved : followed;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Favourites</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Your saved and followed providers</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 max-w-xs">
        {(["saved", "followed"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-xl py-2 text-sm font-semibold transition",
              tab === t ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            {t === "saved" ? `Saved (${saved.length})` : `Following (${followed.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] py-16 text-center">
          <Heart className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
          <p className="text-base font-bold text-[var(--muted)]">
            {tab === "saved" ? "No saved providers yet" : "Not following anyone yet"}
          </p>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-dark)]"
          >
            Browse providers
          </a>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              isSaved={savedSet.has(p.id)}
              isFollowed={followedSet.has(p.id)}
              onToggleSave={toggleSave}
              onToggleFollow={toggleFollow}
              onBook={setBookingProvider}
            />
          ))}
        </div>
      )}

      {bookingProvider && (
        <BookingFlow
          open
          onClose={() => setBookingProvider(null)}
          providerProfileId={bookingProvider.id}
          providerName={bookingProvider.name}
          services={bookingProvider.services}
        />
      )}
    </div>
  );
}
