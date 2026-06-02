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
  Star,
  Store,
  UserRoundPlus,
  X
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { providers } from "@/domain/seed";
import type { Provider, ServiceCategory } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const categories: Array<ServiceCategory | "All"> = ["All", "Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa"];

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

export function MarketplaceApp() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "All">("All");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const filteredProviders = useMemo(() => {
    const value = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const categoryMatch = category === "All" || provider.category === category;
      const searchMatch =
        !value ||
        [provider.name, provider.businessName, provider.handle, provider.category, provider.location.label, provider.bio]
          .join(" ").toLowerCase().includes(value);
      return categoryMatch && searchMatch;
    });
  }, [category, query]);

  function openProvider(provider: Provider) {
    setSelectedProvider(provider);
    setSelectedServiceId(provider.services[0].id);
  }

  function closeProvider() {
    setSelectedProvider(null);
    setSelectedServiceId("");
  }

  const selectedService = selectedProvider?.services.find((s) => s.id === selectedServiceId)
    ?? selectedProvider?.services[0];

  return (
    <div className="min-h-screen bg-white">
      <TopBar />

      {/* Hero */}
      <HeroSection query={query} onQueryChange={setQuery} />

      {/* Main discovery */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-28 lg:pb-16">

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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

          {filteredProviders.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] py-20 text-center">
              <p className="text-lg font-bold text-[var(--muted)]">No providers found</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Try a different category or search term</p>
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

      <MobileNav />
    </div>
  );
}

/* ─── Top bar ─────────────────────────────────────────────── */

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
            <Image src="/images/glowith-icon.png" alt="Glowith" width={36} height={36} className="object-cover" onError={() => {}} />
          </div>
          <span className="text-base font-black tracking-tight">Glowith</span>
        </div>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {["Discover", "Portfolio", "Bookings", "Inbox"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]">
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] transition hover:bg-[var(--background)]" aria-label="Notifications">
            <Bell className="h-4 w-4 text-[var(--muted)]" />
          </button>
          <button className="focus-ring hidden h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold transition hover:bg-[var(--background)] sm:inline-flex">
            List your business
          </button>
          <Button className="hidden rounded-xl sm:inline-flex">
            <UserRoundPlus className="h-4 w-4" />
            Log in
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ────────────────────────────────────────────────── */

function HeroSection({ query, onQueryChange }: { query: string; onQueryChange: (v: string) => void }) {
  return (
    <section
      className="flex min-h-[480px] flex-col items-center justify-center px-4 py-20 text-center sm:min-h-[520px] sm:px-6 lg:px-8"
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #fdf0fa 45%, #fce8f0 75%, #fde8dc 100%)"
      }}
    >
      <h1 className="text-balance text-5xl font-black leading-[1.08] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-7xl">
        Book local beauty<br />
        <span style={{ color: "#D94472" }}>services</span>
      </h1>

      <p className="mx-auto mt-5 max-w-lg text-lg font-medium text-[var(--muted)]">
        Discover top-rated salons, hair artists, nail techs and beauty experts near you.
      </p>

      {/* 3-part search bar */}
      <div className="mt-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xl shadow-black/5">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          {/* Treatment */}
          <div className="flex flex-1 items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:border-b-0 sm:border-r">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="All treatments"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
            />
          </div>
          {/* Location */}
          <div className="flex flex-1 items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:border-b-0 sm:border-r">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              placeholder="Current location"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
            />
          </div>
          {/* Date */}
          <div className="flex flex-1 items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:border-b-0">
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              placeholder="Any time"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--muted)] outline-none"
            />
          </div>
          {/* Search button */}
          <div className="p-2">
            <button className="focus-ring flex h-full w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--ink)]/90 sm:w-auto">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm font-semibold text-[var(--muted)]">
        <span className="font-black text-[var(--ink)]">12,400+</span> appointments booked today
      </p>
    </section>
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
        {/* Featured badge */}
        {provider.verified && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
            <BadgeCheck className="h-3.5 w-3.5 text-[var(--sage)]" />
            Verified
          </div>
        )}
        {/* Save */}
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

/* ─── Provider drawer (slides up from bottom) ─────────────── */

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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
      >
        {/* Drag handle */}
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

            {/* Left: info + portfolio */}
            <div className="space-y-6">
              {/* Provider header */}
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
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{provider.bio}</p>
                </div>
              </div>

              {/* Portfolio */}
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

              {/* Inbox */}
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

            {/* Right: booking */}
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
                  {/* Services */}
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

                  {/* Time slots */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {["09:00", "12:30", "15:30", "17:00"].map((time) => (
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

              {/* Studio */}
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

/* ─── Mobile nav ───────────────────────────────────────────── */

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 px-4 py-2 backdrop-blur-md lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {[
          [Search, "Discover"],
          [Heart, "Saved"],
          [CalendarDays, "Book"],
          [MessageCircle, "Inbox"]
        ].map(([Icon, label]) => (
          <button key={label as string} className="focus-ring flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">
            <Icon className="h-5 w-5" />
            {label as string}
          </button>
        ))}
      </div>
    </nav>
  );
}
