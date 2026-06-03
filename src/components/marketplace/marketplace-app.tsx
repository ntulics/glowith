"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Sliders,
  Star,
  Store,
  UserRoundPlus,
  X
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { providers } from "@/domain/seed";
import type { Provider, ServiceCategory } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const categories: Array<ServiceCategory | "All"> = ["All", "Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa"];
const fallbackLocation = { label: "Rosebank, Johannesburg", areaName: "Rosebank", lat: -26.1458, lng: 28.042 };
const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

function getHeroHeadline(areaName: string | null): { headline: ReactNode; subtext: string } {
  if (areaName) {
    return {
      headline: (
        <>
          Your glow awaits<br />
          <span style={{ color: "#D94472" }}>in {areaName}</span>
        </>
      ),
      subtext: `Discover top-rated salons, hair artists, nail techs and beauty experts in and around ${areaName}.`
    };
  }
  return {
    headline: (
      <>
        Beauty, on<br />
        <span style={{ color: "#D94472" }}>your terms</span>
      </>
    ),
    subtext: "Discover top-rated salons, hair artists, nail techs and beauty experts near you."
  };
}

export function MarketplaceApp() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "All">("All");
  const [locationQuery, setLocationQuery] = useState("Detecting location…");
  const [userLocation, setUserLocation] = useState(fallbackLocation);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("Any time");
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [distanceByProvider, setDistanceByProvider] = useState<Record<string, number>>({});
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [searchInTopBar, setSearchInTopBar] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GPS location + reverse geocode for area name
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationQuery(fallbackLocation.label);
      setAreaName(fallbackLocation.areaName);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        let label = "Current location";
        let area: string | null = null;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address ?? {};
            const candidates = [
              addr.suburb, addr.neighbourhood, addr.hamlet,
              addr.city_district, addr.city, addr.town, addr.village
            ].filter((v): v is string =>
              typeof v === "string" &&
              !/\bward\s*\d+/i.test(v) &&   // skip "Ward 19", "Emalahleni Ward 19"
              !/^\d/.test(v)                  // skip numeric-prefixed strings
            );
            area = candidates[0] ?? null;
            label = area ?? "Current location";
          }
        } catch {
          // silently fall through
        }

        setUserLocation({ label, areaName: area ?? "", lat, lng });
        setLocationQuery(label);
        setAreaName(area);
      },
      () => {
        setLocationQuery(fallbackLocation.label);
        setAreaName(fallbackLocation.areaName);
        setUserLocation(fallbackLocation);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // When locationQuery changes (typed by user), debounce forward geocode
  const geocodeTypedLocation = useCallback((value: string) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (!value || value === "Current location" || value === "Detecting location…") return;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=1&countrycodes=za`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data[0]) {
            setUserLocation({
              label: value,
              areaName: value,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            });
          }
        }
      } catch {
        // silently fall through
      }
    }, 600);
  }, []);

  // Compute distances client-side whenever userLocation changes
  useEffect(() => {
    const distances: Record<string, number> = {};
    for (const p of providers) {
      distances[p.id] = haversineKm(userLocation.lat, userLocation.lng, p.location.lat, p.location.lng);
    }
    setDistanceByProvider(distances);
  }, [userLocation.lat, userLocation.lng]);

  // Observe hero search bar to know when to move it to the top bar
  useEffect(() => {
    const el = heroSearchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSearchInTopBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayProviders = useMemo(
    () => providers.map((provider) => ({
      ...provider,
      distanceKm: distanceByProvider[provider.id] !== undefined
        ? Math.round(distanceByProvider[provider.id] * 10) / 10
        : provider.distanceKm
    })),
    [distanceByProvider]
  );

  const filteredProviders = useMemo(() => {
    const value = query.trim().toLowerCase();
    return displayProviders.filter((provider) => {
      const categoryMatch = category === "All" || provider.category === category;
      const searchMatch =
        !value ||
        [
          provider.name,
          provider.businessName,
          provider.handle,
          provider.category,
          provider.location.label,
          provider.bio,
          ...provider.services.map((service) => service.name)
        ]
          .join(" ").toLowerCase().includes(value);
      const withinRadius = (distanceByProvider[provider.id] ?? 0) <= radiusKm;
      return categoryMatch && searchMatch && withinRadius;
    }).sort((a, b) => (distanceByProvider[a.id] ?? a.distanceKm) - (distanceByProvider[b.id] ?? b.distanceKm));
  }, [category, displayProviders, distanceByProvider, radiusKm, query]);

  function openProvider(provider: Provider) {
    setSelectedProvider(provider);
    setSelectedServiceId(provider.services[0].id);
  }

  function closeProvider() {
    setSelectedProvider(null);
    setSelectedServiceId("");
  }

  function handleLocationChange(val: string) {
    setLocationQuery(val);
    geocodeTypedLocation(val);
  }

  const selectedService = selectedProvider?.services.find((s) => s.id === selectedServiceId)
    ?? selectedProvider?.services[0];

  const searchProps = { query, locationQuery, timeFilter, radiusKm, onQueryChange: setQuery, onLocationChange: handleLocationChange, onTimeChange: setTimeFilter, onRadiusChange: setRadiusKm };

  return (
    <div className="min-h-screen bg-white">
      <TopBar searchInTopBar={searchInTopBar} searchProps={searchProps} providers={displayProviders} areaName={areaName} />

      {/* Hero */}
      <HeroSection
        heroSearchRef={heroSearchRef}
        areaName={areaName}
        {...searchProps}
        providers={displayProviders}
      />

      {/* Main discovery */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 lg:pb-16">

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scroll-x py-7">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                "focus-ring inline-flex h-10 shrink-0 items-center rounded-full border px-5 text-sm font-semibold transition",
                item === category
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]/40 hover:text-[var(--ink)]"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Provider grid */}
        <section>
          <h2 className="mb-5 text-xl font-black">
            {category === "All" ? "Recommended near you" : category}
            <span className="ml-2 text-sm font-semibold text-[var(--muted)]">
              {filteredProviders.length} available
            </span>
          </h2>

          {/* Desktop grid */}
          <div className="hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {filteredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isSelected={selectedProvider?.id === provider.id}
                  onSelect={() => openProvider(provider)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Mobile card stack — cards stick and layer as you scroll */}
          <div className="relative sm:hidden">
            {filteredProviders.map((provider, index) => (
              <div
                key={provider.id}
                className="sticky pb-[2px]"
                style={{ top: `calc(4.25rem + ${index * 6}px)`, zIndex: index + 1 }}
              >
                <ProviderCard
                  provider={provider}
                  isSelected={selectedProvider?.id === provider.id}
                  onSelect={() => openProvider(provider)}
                />
              </div>
            ))}
          </div>

          {filteredProviders.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] py-20 text-center">
              <MapPin className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
              <p className="text-lg font-bold text-[var(--muted)]">
                No beauty providers within {radiusKm} km
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                of {locationQuery}. Try a wider radius or different location.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Provider detail drawer */}
      <AnimatePresence>
        {selectedProvider && selectedService && (
          <ProviderDrawer
            provider={selectedProvider}
            selectedServiceId={selectedServiceId}
            selectedService={selectedService}
            onServiceChange={setSelectedServiceId}
            onClose={closeProvider}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

/* ─── Top bar ─────────────────────────────────────────────── */

type SearchBarProps = {
  query: string;
  locationQuery: string;
  timeFilter: string;
  radiusKm: number;
  onQueryChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onRadiusChange: (v: number) => void;
};

function TopBar({ searchInTopBar, searchProps, providers, areaName }: { searchInTopBar: boolean; searchProps: SearchBarProps; providers: Provider[]; areaName: string | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-[4.25rem] max-w-7xl items-center px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <div className="flex shrink-0 items-center">
            <Image
              src="/images/glowith-logo.png"
              alt="Glowith"
              width={121}
              height={34}
              className="h-[2.125rem] w-auto object-contain"
              style={{ filter: "brightness(0) saturate(100%) invert(27%) sepia(72%) saturate(820%) hue-rotate(308deg) brightness(117%)" }}
              onError={() => {}}
              priority
            />
          </div>

          {/* Desktop nav — absolutely centred, hidden when search active */}
          <AnimatePresence>
            {!searchInTopBar && (
              <motion.nav
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 md:flex"
                aria-label="Primary"
              >
                {["Discover", "Portfolio", "Bookings", "Inbox"].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]">
                    {item}
                  </a>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>

          {/* Compact search — desktop only (md+), absolutely centred */}
          <AnimatePresence>
            {searchInTopBar && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0.95 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0.95 }}
                className="absolute left-1/2 hidden w-full max-w-xl -translate-x-1/2 px-2 md:block lg:max-w-2xl"
              >
                <CompactSearchBar {...searchProps} providers={providers} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] transition hover:bg-[var(--background)]" aria-label="Notifications">
              <Bell className="h-4 w-4 text-[var(--muted)]" />
            </button>
            {!searchInTopBar && (
              <button className="focus-ring hidden h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold transition hover:bg-[var(--background)] sm:inline-flex">
                List your business
              </button>
            )}
            <a
              href="/login"
              className="focus-ring hidden h-9 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] sm:inline-flex"
            >
              <UserRoundPlus className="h-4 w-4" />
              Log in
            </a>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] transition hover:bg-[var(--background)] sm:hidden"
              aria-label="Open menu"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-white shadow-2xl sm:hidden"
            >
              {/* Menu header */}
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <Image
                  src="/images/glowith-logo.png"
                  alt="Glowith"
                  width={100}
                  height={28}
                  className="h-7 w-auto object-contain"
                  style={{ filter: "brightness(0) saturate(100%) invert(27%) sepia(72%) saturate(820%) hue-rotate(308deg) brightness(117%)" }}
                />
                <button onClick={() => setMobileMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Location badge */}
              {areaName && (
                <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-3">
                  <MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />
                  <span className="text-xs font-semibold text-[var(--muted)]">{areaName}</span>
                </div>
              )}

              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-4">
                {["Discover", "Portfolio", "Bookings", "Inbox"].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--background)]">
                    {item}
                  </a>
                ))}
              </nav>

              {/* Bottom actions */}
              <div className="mt-auto space-y-3 border-t border-[var(--line)] p-5">
                <button className="w-full rounded-xl border border-[var(--line)] py-2.5 text-sm font-semibold hover:bg-[var(--background)]">
                  List your business
                </button>
                <a href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]">
                  <UserRoundPlus className="h-4 w-4" />
                  Log in
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function CompactSearchBar({ query, locationQuery, timeFilter, radiusKm, onQueryChange, onLocationChange, onTimeChange, onRadiusChange, providers }: SearchBarProps & { providers: Provider[] }) {
  const [activePanel, setActivePanel] = useState<"treatments" | "location" | "time" | null>(null);
  const locationOptions = useMemo(() => Array.from(new Set(providers.map((p) => p.location.label))), [providers]);
  const treatmentOptions = useMemo(() => Array.from(new Set(providers.flatMap((p) => p.services.map((s) => s.name)))), [providers]);

  return (
    <div className="relative w-full">
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-md">
        {/* Service */}
        <div className="flex items-center gap-2 border-r border-[var(--line)] px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          <input
            value={query}
            onFocus={() => setActivePanel("treatments")}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="All treatments"
            className="w-28 bg-transparent text-xs font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
          />
        </div>
        {/* Location */}
        <div className="flex flex-[2] items-center gap-2 border-r border-[var(--line)] px-3 py-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          <input
            value={locationQuery}
            onFocus={() => setActivePanel("location")}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Location"
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
          />
          <span className="shrink-0 rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">{radiusKm}km</span>
        </div>
        {/* Search */}
        <button
          onClick={() => setActivePanel(null)}
          className="flex items-center gap-1.5 rounded-r-[14px] bg-[var(--ink)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--ink)]/90"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      <AnimatePresence>
        {activePanel === "treatments" && (
          <SearchPanel onClose={() => setActivePanel(null)} align="left">
            <div className="flex flex-wrap gap-2">
              {["All", ...categories.filter((c) => c !== "All")].map((item) => (
                <button key={item} onClick={() => { onQueryChange(item === "All" ? "" : item); setActivePanel(null); }}
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--ink)]">
                  {item === "All" ? "All treatments" : item}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-1">
              {treatmentOptions.slice(0, 8).map((item) => (
                <button key={item} onClick={() => { onQueryChange(item); setActivePanel(null); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#F9F5F3]">
                  {item}<ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                </button>
              ))}
            </div>
          </SearchPanel>
        )}
        {activePanel === "location" && (
          <SearchPanel onClose={() => setActivePanel(null)} align="center">
            <LocationPanel locationOptions={locationOptions} radiusKm={radiusKm} onLocationChange={onLocationChange} onRadiusChange={onRadiusChange} onClose={() => setActivePanel(null)} />
          </SearchPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Hero ────────────────────────────────────────────────── */

function HeroSection({
  heroSearchRef,
  areaName,
  query,
  locationQuery,
  timeFilter,
  radiusKm,
  providers,
  onQueryChange,
  onLocationChange,
  onTimeChange,
  onRadiusChange
}: SearchBarProps & {
  heroSearchRef: React.RefObject<HTMLDivElement | null>;
  areaName: string | null;
  providers: Provider[];
}) {
  const [activePanel, setActivePanel] = useState<"treatments" | "location" | "time" | null>(null);
  const treatmentOptions = useMemo(
    () => Array.from(new Set(providers.flatMap((provider) => provider.services.map((service) => service.name)))),
    [providers]
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(providers.map((provider) => provider.location.label))),
    [providers]
  );
  const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);
  const { headline, subtext } = getHeroHeadline(areaName);

  return (
    <section
      className="flex min-h-[480px] flex-col items-center justify-center px-4 py-20 text-center sm:min-h-[520px] sm:px-6 lg:px-8"
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #fdf0fa 45%, #fce8f0 75%, #fde8dc 100%)"
      }}
    >
      <h1 className="text-balance font-black leading-[1.08] tracking-tight text-[var(--ink)]"
        style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)" }}>
        {headline}
      </h1>

      <p className="mx-auto mt-5 max-w-lg text-lg font-medium text-[var(--muted)]">
        {subtext}
      </p>

      {/* 3-part search bar */}
      <div ref={heroSearchRef} className="relative mt-10 w-full max-w-6xl rounded-[1.75rem] border border-[var(--line)] bg-white shadow-xl shadow-black/5">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          {/* Treatment */}
          <div className="flex flex-1 items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:border-b-0 sm:border-r">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onFocus={() => setActivePanel("treatments")}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="All treatments"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
            />
          </div>
          {/* Location — wider (flex-[2]) */}
          <div className="flex flex-[2] items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:border-b-0 sm:border-r">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              value={locationQuery}
              onFocus={() => setActivePanel("location")}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="City, suburb or area"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setActivePanel("location"); }}
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-xs font-bold text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <Sliders className="h-3 w-3" />
              {radiusKm} km
            </button>
          </div>
          {/* Date */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "time" ? null : "time")}
            className="flex flex-1 items-center gap-3 border-b border-[var(--line)] px-5 py-4 text-left sm:border-b-0"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--ink)]">{timeFilter}</span>
          </button>
          {/* Search button */}
          <div className="p-2">
            <button
              onClick={() => setActivePanel(null)}
              className="focus-ring flex h-full w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[var(--ink)] px-8 py-3 text-sm font-bold text-white transition hover:bg-[var(--ink)]/90 sm:w-auto"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {activePanel === "treatments" && (
            <SearchPanel onClose={() => setActivePanel(null)} align="left">
              <div className="flex flex-wrap gap-2">
                {["All", ...categories.filter((item) => item !== "All")].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      onQueryChange(item === "All" ? "" : item);
                      setActivePanel(null);
                    }}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--ink)]"
                  >
                    {item === "All" ? "All treatments" : item}
                  </button>
                ))}
              </div>
              <div className="mt-5 space-y-2 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Available near {locationQuery || "your location"}
                </p>
                {treatmentOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      onQueryChange(item);
                      setActivePanel(null);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#F9F5F3]"
                  >
                    <span>{item}</span>
                    <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                  </button>
                ))}
              </div>
            </SearchPanel>
          )}

          {activePanel === "location" && (
            <SearchPanel onClose={() => setActivePanel(null)} align="center">
              <LocationPanel
                locationOptions={locationOptions}
                radiusKm={radiusKm}
                onLocationChange={onLocationChange}
                onRadiusChange={onRadiusChange}
                onClose={() => setActivePanel(null)}
              />
            </SearchPanel>
          )}

          {activePanel === "time" && (
            <SearchPanel onClose={() => setActivePanel(null)} align="right" wide>
              <div className="grid gap-6 text-left md:grid-cols-[160px_1fr]">
                <div className="space-y-3">
                  {["Today", "Tomorrow", "Any time"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        onTimeChange(item);
                        if (item === "Any time") setActivePanel(null);
                      }}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-sm font-bold",
                        timeFilter === item ? "border-[var(--brand)] text-[var(--brand)]" : "border-[var(--line)]"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <button className="rounded-full p-2 hover:bg-[#F9F5F3]" aria-label="Previous month">‹</button>
                    <p className="font-black">Jun 2026</p>
                    <button className="rounded-full p-2 hover:bg-[#F9F5F3]" aria-label="Next month">›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--muted)]">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm font-semibold">
                    {calendarDays.map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          onTimeChange(`Jun ${day}`);
                          setActivePanel(null);
                        }}
                        className={cn(
                          "h-9 rounded-full hover:bg-[#F9F5F3]",
                          day === 3 && "border border-[var(--brand)] text-[var(--brand)]"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                    {["Any time", "Morning", "Afternoon", "Evening"].map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          onTimeChange(item);
                          setActivePanel(null);
                        }}
                        className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SearchPanel>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-5 text-sm font-semibold text-[var(--muted)]">
        <span className="font-black text-[var(--ink)]">12,400+</span> appointments booked today
      </p>
    </section>
  );
}

/* ─── Location panel (shared between hero + compact) ──────── */

function LocationPanel({
  locationOptions,
  radiusKm,
  onLocationChange,
  onRadiusChange,
  onClose
}: {
  locationOptions: string[];
  radiusKm: number;
  onLocationChange: (v: string) => void;
  onRadiusChange: (v: number) => void;
  onClose: () => void;
}) {
  const [customRadius, setCustomRadius] = useState("");

  return (
    <div className="space-y-5 text-left">
      {/* Quick location options */}
      <div className="space-y-1">
        <button
          onClick={() => {
            onLocationChange("Current location");
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[#F9F5F3]"
        >
          <MapPin className="h-4 w-4 text-[var(--brand)]" />
          Use current location
        </button>
        {locationOptions.map((item) => (
          <button
            key={item}
            onClick={() => {
              onLocationChange(item);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[#F9F5F3]"
          >
            <MapPin className="h-4 w-4 text-[var(--muted)]" />
            {item}
          </button>
        ))}
      </div>

      {/* Radius selector */}
      <div className="border-t border-[var(--line)] pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Search radius</p>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition",
                radiusKm === r
                  ? "border-[var(--brand)] bg-[#FFF0F4] text-[var(--brand)]"
                  : "border-[var(--line)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              )}
            >
              {r} km
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={customRadius}
            onChange={(e) => setCustomRadius(e.target.value)}
            placeholder="Custom km"
            className="w-28 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--brand)]"
          />
          <button
            onClick={() => {
              const val = parseInt(customRadius, 10);
              if (val > 0) { onRadiusChange(val); setCustomRadius(""); onClose(); }
            }}
            className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--ink)]/90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchPanel({
  children,
  align,
  wide = false,
  onClose
}: {
  children: ReactNode;
  align: "left" | "center" | "right";
  wide?: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <button className="fixed inset-0 z-10 cursor-default" aria-label="Close search panel" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={cn(
          "absolute top-[calc(100%+0.5rem)] z-20 max-h-[70vh] overflow-y-auto rounded-3xl border border-[var(--line)] bg-white p-6 text-left shadow-2xl shadow-black/10",
          wide ? "w-[min(720px,calc(100vw-2rem))]" : "w-[min(600px,calc(100vw-2rem))]",
          align === "left" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "right" && "right-0"
        )}
      >
        {children}
      </motion.div>
    </>
  );
}

/* ─── Provider card ───────────────────────────────────────── */

function ProviderCard({
  provider,
  isSelected,
  onSelect
}: {
  provider: Provider;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "focus-ring group w-full cursor-pointer overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:shadow-md",
        isSelected ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20" : "border-[var(--line)]"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f3e8e4]">
        <Image
          src={provider.portfolio[0].image}
          alt={provider.businessName}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {provider.verified && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
            <BadgeCheck className="h-3.5 w-3.5 text-[var(--sage)]" />
            Verified
          </div>
        )}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition hover:bg-white"
          aria-label="Save"
        >
          <Heart className="h-3.5 w-3.5 text-[var(--muted)]" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold">{provider.businessName}</h3>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{provider.category} · {provider.location.label}</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF8E7] px-2 py-0.5 text-xs font-bold">
            <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
            {provider.rating}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />{provider.distanceKm} km away
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--sage)]">
            <Clock3 className="h-3 w-3" />{provider.nextAvailable}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--muted)]">
            from {formatCurrency(Math.min(...provider.services.map((s) => s.priceCents)))}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand)]">
            Book now <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Provider drawer ─────────────────────────────────────── */

function ProviderDrawer({
  provider,
  selectedServiceId,
  selectedService,
  onServiceChange,
  onClose
}: {
  provider: Provider;
  selectedServiceId: string;
  selectedService: { id: string; name: string; durationMinutes: number; priceCents: number; depositCents: number };
  onServiceChange: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[88vh] max-w-7xl overflow-y-auto rounded-3xl bg-white shadow-2xl sm:inset-x-6 lg:inset-x-8"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--line)] sm:hidden" />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-[var(--muted)]">{provider.name}</p>
            <h2 className="text-lg font-black">{provider.businessName}</h2>
          </div>
          <button onClick={onClose} className="focus-ring ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] transition hover:bg-[var(--background)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-10 pt-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f3e8e4]">
                  <Image src={provider.portfolio[0].image} alt="" fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{provider.businessName}</h2>
                    {provider.verified && <BadgeCheck className="h-4 w-4 text-[var(--sage)]" />}
                  </div>
                  <p className="text-sm text-[var(--muted)]">{provider.name} · {provider.category}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
                      {provider.rating} ({provider.reviewCount} reviews)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{provider.location.label}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{provider.distanceKm} km away
                    </span>
                  </div>
                  {provider.bookingEmail && (
                    <p className="mt-2 text-xs font-semibold text-[var(--muted)]">{provider.bookingEmail}</p>
                  )}
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{provider.bio}</p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-black">Portfolio</h3>
                  <button className="text-xs font-bold text-[var(--brand)]">Follow</button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {provider.portfolio.map((post) => (
                    <div key={post.id} className="overflow-hidden rounded-xl border border-[var(--line)]">
                      <div className="relative aspect-square bg-[#f3e8e4]">
                        <Image src={post.image} alt={post.caption} fill sizes="150px" className="object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-1 text-xs font-semibold">{post.caption}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">♥ {post.likes} · ⊕ {post.saves}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-black">Message {provider.name.split(" ")[0]}</h3>
                  <MessageCircle className="h-4 w-4 text-[var(--brand)]" />
                </div>
                <div className="mb-3 rounded-xl bg-[#FFF8F4] p-3 text-sm">
                  <p className="font-semibold">{provider.name}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    I can confirm once the {formatCurrency(selectedService.depositCents)} deposit reflects.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Ask a question…" className="rounded-xl border-[var(--line)] text-sm" />
                  <button className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ink)] text-white" aria-label="Send">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="rounded-2xl border-[var(--line)] shadow-sm">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)]">Booking</p>
                      <h3 className="text-base font-black">Reserve a slot</h3>
                    </div>
                    <CalendarDays className="h-4 w-4 text-[var(--sage)]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-5">
                  <div className="space-y-2">
                    {provider.services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => onServiceChange(service.id)}
                        className={cn(
                          "focus-ring flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition",
                          selectedServiceId === service.id
                            ? "border-[var(--brand)] bg-[#FFF0F4]"
                            : "border-[var(--line)] bg-white hover:border-[var(--brand)]/30"
                        )}
                      >
                        <span>
                          <span className="block font-bold">{service.name}</span>
                          <span className="text-xs text-[var(--muted)]">{service.durationMinutes} min</span>
                        </span>
                        <span className="text-right">
                          <span className="block font-black">{formatCurrency(service.priceCents)}</span>
                          <span className="text-xs text-[var(--muted)]">{formatCurrency(service.depositCents)} deposit</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {(provider.availableSlots ?? ["09:00", "12:30", "15:30", "17:00"]).map((time) => (
                      <button key={time} className="focus-ring rounded-xl border border-[var(--line)] py-2.5 text-xs font-bold transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                        {time}
                      </button>
                    ))}
                  </div>

                  <Button className="w-full rounded-xl bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90">
                    <CreditCard className="h-4 w-4" />
                    Pay {formatCurrency(selectedService.depositCents)} deposit
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[var(--line)] shadow-sm">
                <CardHeader className="pb-2 pt-4">
                  <h3 className="font-black">Provider studio</h3>
                </CardHeader>
                <CardContent className="space-y-2.5 pb-4 text-sm text-[var(--muted)]">
                  {[
                    ["Portfolio posts", "2 queued"],
                    ["Calendar sync", "Google + Outlook"],
                    ["Notifications", "WhatsApp ready"]
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between font-medium">
                      <span>{label}</span>
                      <span className="font-semibold text-[var(--ink)]">{value}</span>
                    </div>
                  ))}
                  <Button variant="secondary" className="mt-2 w-full rounded-xl">
                    <Store className="h-4 w-4" />
                    Open studio
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ─── Footer ───────────────────────────────────────────────── */

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--line)] bg-[#fdfaf9] px-4 pt-14 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Image
              src="/images/glowith-logo.png"
              alt="Glowith"
              width={110}
              height={31}
              className="h-8 w-auto object-contain"
              style={{ filter: "brightness(0) saturate(100%) invert(27%) sepia(72%) saturate(820%) hue-rotate(308deg) brightness(117%)" }}
            />
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Glowith is South Africa's social beauty marketplace — connecting clients with top-rated hair, nail, makeup, and wellness professionals in their area.
            </p>
            <p className="mt-6 text-xs text-[var(--muted)]">
              © {year} Glowith. All rights reserved.<br />
              All other trademarks are the property of their respective owners.
            </p>
          </div>

          {/* About Glowith */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ink)]">About Glowith</h3>
            <ul className="mt-4 space-y-3">
              {[
                ["About us", "#about"],
                ["Contact us", "#contact"],
                ["Help & Support", "#support"],
                ["Blog", "#blog"],
                ["Careers", "#careers"],
                ["List your business", "#list"]
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-sm text-[var(--muted)] transition hover:text-[var(--brand)]">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ink)]">Legal</h3>
            <ul className="mt-4 space-y-3">
              {[
                ["Privacy Policy", "#privacy"],
                ["Terms of Service", "#terms"],
                ["Terms of Use", "#terms-use"],
                ["Cookie Policy", "#cookies"],
                ["Accessibility", "#accessibility"]
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-sm text-[var(--muted)] transition hover:text-[var(--brand)]">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ink)]">Connect</h3>
            <ul className="mt-4 space-y-3">
              {[
                ["Instagram", "https://instagram.com"],
                ["TikTok", "https://tiktok.com"],
                ["Facebook", "https://facebook.com"],
                ["WhatsApp", "https://wa.me"]
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--muted)] transition hover:text-[var(--brand)]">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--line)] pt-6 sm:flex-row">
          <p className="text-xs text-[var(--muted)]">
            Made with love in South Africa 🇿🇦
          </p>
          <p className="text-center text-xs text-[var(--muted)]">
            © {year} Glowith (Pty) Ltd. All rights reserved. All other trademarks are the property of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
