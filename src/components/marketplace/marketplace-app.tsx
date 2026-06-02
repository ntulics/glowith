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
  Sparkles,
  Star,
  Store,
  UserRoundPlus
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

const categoryEmoji: Record<string, string> = {
  All: "✦",
  Hair: "💇",
  Nails: "💅",
  Makeup: "💄",
  Lashes: "👁️",
  Brows: "🪮",
  Barber: "✂️",
  Spa: "🌿"
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

export function MarketplaceApp() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "All">("All");
  const [selectedProvider, setSelectedProvider] = useState<Provider>(providers[0]);
  const [selectedServiceId, setSelectedServiceId] = useState(providers[0].services[0].id);

  const filteredProviders = useMemo(() => {
    const value = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const categoryMatch = category === "All" || provider.category === category;
      const searchMatch =
        !value ||
        [provider.name, provider.businessName, provider.handle, provider.category, provider.location.label, provider.bio]
          .join(" ")
          .toLowerCase()
          .includes(value);
      return categoryMatch && searchMatch;
    });
  }, [category, query]);

  useEffect(() => {
    if (filteredProviders.length > 0 && !filteredProviders.some((p) => p.id === selectedProvider.id)) {
      selectProvider(filteredProviders[0]);
    }
  }, [filteredProviders, selectedProvider.id]);

  const selectedService =
    selectedProvider.services.find((s) => s.id === selectedServiceId) ?? selectedProvider.services[0];

  function selectProvider(provider: Provider) {
    setSelectedProvider(provider);
    setSelectedServiceId(provider.services[0].id);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar />

      {/* Hero — full width gradient, no image overlay */}
      <HeroSearch query={query} onQueryChange={setQuery} />

      {/* Page body — single scroll */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scroll-x py-6 -mx-1 px-1">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                "focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition",
                item === category
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-sm"
                  : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--brand)]/40 hover:text-[var(--ink)]"
              )}
            >
              <span className="text-xs">{categoryEmoji[item]}</span>
              {item}
            </button>
          ))}
        </div>

        {/* Two-column layout: provider list + detail panel */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">

          {/* ── Left: provider list ── */}
          <section className="space-y-3" aria-label="Providers">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
              {filteredProviders.length} provider{filteredProviders.length !== 1 ? "s" : ""}
              {category !== "All" ? ` in ${category}` : " near you"}
            </h2>
            <AnimatePresence initial={false}>
              {filteredProviders.map((provider) => (
                <motion.button
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  key={provider.id}
                  onClick={() => selectProvider(provider)}
                  className={cn(
                    "focus-ring grid w-full grid-cols-[80px_1fr_auto] gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition",
                    selectedProvider.id === provider.id
                      ? "border-[var(--brand)] ring-1 ring-[var(--brand)]/20"
                      : "border-[var(--line)] hover:border-[var(--brand)]/40 hover:shadow-md"
                  )}
                >
                  <div className="relative h-20 overflow-hidden rounded-xl bg-[var(--blush)]">
                    <Image src={provider.portfolio[0].image} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 py-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold">{provider.businessName}</h3>
                      {provider.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--sage)]" aria-label="Verified" />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{provider.handle} · {provider.category}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
                        {provider.rating} <span className="font-normal">({provider.reviewCount})</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{provider.distanceKm} km
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />{provider.nextAvailable}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={cn("mt-6 h-4 w-4 transition-transform", selectedProvider.id === provider.id ? "text-[var(--brand)]" : "text-[var(--line)]")} />
                </motion.button>
              ))}
            </AnimatePresence>

            {filteredProviders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white py-16 text-center">
                <p className="font-semibold text-[var(--muted)]">No providers match your search</p>
              </div>
            )}
          </section>

          {/* ── Right: provider detail + booking — sticky, no independent scroll ── */}
          <div className="space-y-4 lg:sticky lg:top-[4.75rem] lg:self-start">
            <ProviderDetailCard provider={selectedProvider} />
            <BookingCard
              provider={selectedProvider}
              selectedServiceId={selectedServiceId}
              onServiceChange={setSelectedServiceId}
            />
          </div>
        </div>

        {/* Portfolio — full width below both columns */}
        <PortfolioFeed provider={selectedProvider} />

        {/* Inbox + Studio */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <InboxCard provider={selectedProvider} deposit={selectedService.depositCents} />
          <StudioCard />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

/* ─── Top bar ─────────────────────────────────────────────── */

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--peach)]">
            <Sparkles className="h-4.5 w-4.5 text-white" aria-hidden="true" />
          </div>
          <div className="leading-none">
            <p className="text-base font-black tracking-tight">Glowith</p>
            <p className="text-[10px] font-semibold text-[var(--muted)]">Beauty marketplace</p>
          </div>
        </div>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {["Discover", "Portfolio", "Bookings", "Inbox"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--blush)]/40 hover:text-[var(--ink)]"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white transition hover:bg-[var(--blush)]/40" aria-label="Notifications">
            <Bell className="h-4 w-4 text-[var(--muted)]" />
          </button>
          <Button className="hidden rounded-xl bg-gradient-to-r from-[var(--brand)] to-[#E8547A] text-white shadow-sm hover:opacity-90 sm:inline-flex">
            <UserRoundPlus className="h-4 w-4" />
            Join
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero + search ────────────────────────────────────────── */

function HeroSearch({ query, onQueryChange }: { query: string; onQueryChange: (v: string) => void }) {
  return (
    <section
      className="relative overflow-hidden px-4 pb-10 pt-14 sm:px-6 lg:px-8"
      style={{
        background:
          "linear-gradient(135deg, #FCEEE8 0%, #FCDDE8 40%, #F7D0F0 100%)"
      }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[var(--brand)]/8 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-60 w-60 rounded-full bg-[var(--peach)]/20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
          South Africa&apos;s beauty marketplace
        </p>
        <h1 className="text-balance text-4xl font-black leading-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
          Book beauty you&apos;ll{" "}
          <span className="text-[var(--brand)]">love</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base font-medium text-[var(--muted)]">
          Browse real portfolios, chat before you commit, and secure your slot with a deposit.
        </p>

        {/* Search bar */}
        <div className="mt-8 flex overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg shadow-[var(--brand)]/10">
          <div className="flex flex-1 items-center gap-2 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search hair, nails, makeup, location…"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--ink)] placeholder:text-[var(--muted)] outline-none"
            />
          </div>
          <button className="focus-ring m-1.5 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[#E8547A] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
            Search
          </button>
        </div>

        <p className="mt-4 text-xs font-semibold text-[var(--muted)]">
          Verified talent · Deposit-secured bookings · Chat first
        </p>
      </div>
    </section>
  );
}

/* ─── Provider detail card ─────────────────────────────────── */

function ProviderDetailCard({ provider }: { provider: Provider }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-[var(--line)] shadow-sm">
      {/* Cover strip */}
      <div className="relative h-28 bg-gradient-to-br from-[#FCEEE8] to-[#F9D0E8]">
        <Image
          src={provider.portfolio[0].image}
          alt=""
          fill
          sizes="380px"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[var(--muted)]">{provider.name}</p>
            <h2 className="text-lg font-black leading-tight">{provider.businessName}</h2>
          </div>
          <button className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white transition hover:bg-[var(--blush)]/40" aria-label="Save">
            <Heart className="h-3.5 w-3.5 text-[var(--muted)]" />
          </button>
        </div>

        <p className="text-xs leading-5 text-[var(--muted)]">{provider.bio}</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["Rating", provider.rating.toFixed(1)],
            ["Reviews", String(provider.reviewCount)],
            ["Distance", `${provider.distanceKm} km`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gradient-to-b from-[#FFF3EE] to-[#FDEEE9] p-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
              <p className="mt-0.5 text-base font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#F8F2EE] px-3 py-2 text-xs font-semibold">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--sage)]" />
          {provider.location.label}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Booking card ─────────────────────────────────────────── */

function BookingCard({
  provider,
  selectedServiceId,
  onServiceChange
}: {
  provider: Provider;
  selectedServiceId: string;
  onServiceChange: (id: string) => void;
}) {
  const selectedService = provider.services.find((s) => s.id === selectedServiceId) ?? provider.services[0];

  return (
    <Card className="rounded-2xl border-[var(--line)] shadow-sm" id="bookings">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Booking</p>
            <h3 className="text-base font-black">Reserve a slot</h3>
          </div>
          <CalendarDays className="h-4.5 w-4.5 text-[var(--sage)]" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* Services */}
        <div className="space-y-2">
          {provider.services.map((service) => (
            <button
              key={service.id}
              onClick={() => onServiceChange(service.id)}
              className={cn(
                "focus-ring flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition",
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
            <button
              key={time}
              className="focus-ring rounded-xl border border-[var(--line)] bg-white py-2 text-xs font-bold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {time}
            </button>
          ))}
        </div>

        <Button className="w-full rounded-xl bg-gradient-to-r from-[var(--brand)] to-[#E8547A] text-white shadow-sm hover:opacity-90">
          <CreditCard className="h-4 w-4" />
          Pay {formatCurrency(selectedService.depositCents)} deposit
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Portfolio feed ───────────────────────────────────────── */

function PortfolioFeed({ provider }: { provider: Provider }) {
  return (
    <section id="portfolio" className="mt-10 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Portfolio</p>
          <h2 className="text-xl font-black">{provider.businessName}</h2>
        </div>
        <button className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[var(--blush)]/40">
          <Heart className="h-3.5 w-3.5" />
          Follow
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {provider.portfolio.map((post) => (
          <div key={post.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
            <div className="relative aspect-square bg-[var(--blush)]">
              <Image src={post.image} alt={post.caption} fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover" />
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-1 text-xs font-bold">{post.caption}</p>
              <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--muted)]">
                <span>♥ {post.likes}</span>
                <span>⊕ {post.saves}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Inbox card ───────────────────────────────────────────── */

function InboxCard({ provider, deposit }: { provider: Provider; deposit: number }) {
  return (
    <Card className="rounded-2xl border-[var(--line)] shadow-sm" id="inbox">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">Inbox</h3>
          <MessageCircle className="h-4.5 w-4.5 text-[var(--brand)]" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="rounded-xl bg-gradient-to-b from-[#FFF3EE] to-[#FDEEE9] p-3 text-sm">
          <p className="font-bold">{provider.name}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            I can confirm once the {formatCurrency(deposit)} deposit reflects.
          </p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Message provider…" className="rounded-xl border-[var(--line)]" />
          <button className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--brand)] to-[#E8547A] text-white transition hover:opacity-90" aria-label="Send">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Studio card ──────────────────────────────────────────── */

function StudioCard() {
  return (
    <Card className="rounded-2xl border-[var(--line)] shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <h3 className="text-base font-black">Provider studio</h3>
      </CardHeader>
      <CardContent className="space-y-3 pb-4 text-sm font-semibold text-[var(--muted)]">
        {[
          ["Portfolio posts", "2 queued", "text-[var(--ink)]"],
          ["Calendar sync", "Google + Outlook", "text-[var(--sage)]"],
          ["Notifications", "WhatsApp ready", "text-[var(--sage)]"]
        ].map(([label, value, cls]) => (
          <div key={label} className="flex items-center justify-between">
            <span>{label}</span>
            <span className={cls}>{value}</span>
          </div>
        ))}
        <Button variant="secondary" className="mt-1 w-full rounded-xl">
          <Store className="h-4 w-4" />
          Open studio
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Mobile nav ───────────────────────────────────────────── */

function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/90 px-4 py-2 backdrop-blur-md lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {[
          [Search, "Discover"],
          [Heart, "Saved"],
          [CalendarDays, "Book"],
          [MessageCircle, "Inbox"]
        ].map(([Icon, label]) => (
          <button
            key={label as string}
            className="focus-ring flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold text-[var(--muted)] transition hover:text-[var(--brand)]"
          >
            <Icon className="h-5 w-5" />
            {label as string}
          </button>
        ))}
      </div>
    </nav>
  );
}
