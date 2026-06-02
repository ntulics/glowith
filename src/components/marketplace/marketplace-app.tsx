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
  SlidersHorizontal,
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

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0
  }).format(cents / 100);

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
    if (filteredProviders.length > 0 && !filteredProviders.some((provider) => provider.id === selectedProvider.id)) {
      selectProvider(filteredProviders[0]);
    }
  }, [filteredProviders, selectedProvider.id]);

  const selectedService =
    selectedProvider.services.find((service) => service.id === selectedServiceId) ?? selectedProvider.services[0];

  function selectProvider(provider: Provider) {
    setSelectedProvider(provider);
    setSelectedServiceId(provider.services[0].id);
  }

  return (
    <main className="app-shell min-h-screen pb-24 text-[var(--ink)] lg:pb-0">
      <TopBar />

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
        <div className="space-y-5">
          <HeroPanel />
          <SearchPanel query={query} category={category} onQueryChange={setQuery} onCategoryChange={setCategory} />
          <ProviderRail providers={filteredProviders} selectedProvider={selectedProvider} onSelectProvider={selectProvider} />
          <PortfolioFeed provider={selectedProvider} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1">
          <ProviderDetail provider={selectedProvider} />
          <BookingPanel
            provider={selectedProvider}
            selectedServiceId={selectedServiceId}
            onServiceChange={setSelectedServiceId}
          />
          <OperationsPanel provider={selectedProvider} deposit={selectedService.depositCents} />
        </aside>
      </section>

      <MobileNav />
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#fffaf7]/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand)] text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-black leading-none">Glowith</p>
            <p className="text-xs font-semibold text-[var(--muted)]">Beauty marketplace</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {["Discover", "Portfolio", "Bookings", "Inbox"].map((item) => (
            <a key={item} className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-white" href={`#${item.toLowerCase()}`}>
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <Button className="hidden sm:inline-flex">
            <UserRoundPlus className="h-4 w-4" />
            Join
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroPanel() {
  return (
    <section id="discover" className="relative min-h-[430px] overflow-hidden rounded-lg bg-[var(--ink)] text-white shadow-sm">
      <Image
        src="/images/glowith-hero.png"
        alt="Beauty professionals preparing client hair, makeup, and nails in a modern studio"
        fill
        priority
        sizes="(min-width: 1024px) 58vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/26 to-transparent" />
      <div className="relative flex min-h-[430px] max-w-xl flex-col justify-between p-5 sm:p-7">
        <div className="inline-flex w-fit items-center gap-2 rounded-md bg-white/14 px-3 py-2 text-xs font-bold backdrop-blur">
          <BadgeCheck className="h-4 w-4" />
          Verified local beauty talent
        </div>
        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-black leading-[1.02] sm:text-6xl">Glowith</h1>
          <p className="max-w-md text-base font-medium leading-7 text-white/86">
            Browse real portfolios, chat before you commit, reserve a time, and secure the slot with a deposit.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>
              <Search className="h-4 w-4" />
              Explore providers
            </Button>
            <Button variant="outline" className="border-white/24 bg-white/12 text-white hover:bg-white/20">
              <Store className="h-4 w-4" />
              Provider studio
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchPanel({
  query,
  category,
  onQueryChange,
  onCategoryChange
}: {
  query: string;
  category: ServiceCategory | "All";
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: ServiceCategory | "All") => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search hair, nails, makeup, location"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Filters">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => onCategoryChange(item)}
            className={cn(
              "focus-ring h-9 shrink-0 rounded-md border px-3 text-sm font-bold transition",
              item === category
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProviderRail({
  providers: providerList,
  selectedProvider,
  onSelectProvider
}: {
  providers: Provider[];
  selectedProvider: Provider;
  onSelectProvider: (provider: Provider) => void;
}) {
  return (
    <section className="grid gap-3" aria-label="Providers">
      <AnimatePresence initial={false}>
        {providerList.map((provider) => (
          <motion.button
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            key={provider.id}
            onClick={() => onSelectProvider(provider)}
            className={cn(
              "focus-ring grid w-full grid-cols-[76px_1fr_auto] gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition",
              selectedProvider.id === provider.id ? "border-[var(--brand)]" : "border-[var(--line)] hover:border-[#d8c8c2]"
            )}
          >
            <div className="relative h-[76px] overflow-hidden rounded-md bg-[#f3e8e2]">
              <Image src={provider.portfolio[0].image} alt="" fill sizes="76px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-black">{provider.businessName}</h2>
                {provider.verified ? <BadgeCheck className="h-4 w-4 text-[var(--sage)]" aria-label="Verified" /> : null}
              </div>
              <p className="truncate text-sm font-semibold text-[var(--muted)]">{provider.handle} · {provider.category}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                  {provider.rating} ({provider.reviewCount})
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {provider.distanceKm} km
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {provider.nextAvailable}
                </span>
              </div>
            </div>
            <ChevronRight className="mt-6 h-5 w-5 text-[var(--muted)]" />
          </motion.button>
        ))}
      </AnimatePresence>
    </section>
  );
}

function PortfolioFeed({ provider }: { provider: Provider }) {
  return (
    <section id="portfolio" className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--brand-dark)]">Portfolio</p>
          <h2 className="text-2xl font-black">{provider.businessName}</h2>
        </div>
        <Button variant="ghost" size="sm">
          Follow
          <Heart className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {provider.portfolio.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <div className="relative aspect-square bg-[#f1e7e1]">
              <Image src={post.image} alt={post.caption} fill sizes="(min-width: 768px) 290px, 50vw" className="object-cover" />
            </div>
            <CardContent className="space-y-2 p-3">
              <p className="line-clamp-2 text-sm font-bold">{post.caption}</p>
              <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
                <span>{post.likes} likes</span>
                <span>{post.saves} saves</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ProviderDetail({ provider }: { provider: Provider }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--muted)]">{provider.name}</p>
            <h2 className="text-2xl font-black">{provider.businessName}</h2>
          </div>
          <Button variant="outline" size="icon" aria-label="Save provider">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[var(--muted)]">{provider.bio}</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Rating", provider.rating.toFixed(1)],
            ["Reviews", String(provider.reviewCount)],
            ["Distance", `${provider.distanceKm} km`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-[#f8f0ec] p-3">
              <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
              <p className="text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[#fdf8f4] p-3">
          <div className="flex items-center gap-2 text-sm font-black">
            <MapPin className="h-4 w-4 text-[var(--sage)]" />
            {provider.location.label}
          </div>
          <div className="mt-3 h-32 rounded-md border border-[#e5d6ce] bg-[linear-gradient(135deg,#ead9d0_25%,#f8f0ec_25%,#f8f0ec_50%,#ead9d0_50%,#ead9d0_75%,#f8f0ec_75%)] bg-[length:28px_28px]" />
        </div>
      </CardContent>
    </Card>
  );
}

function BookingPanel({
  provider,
  selectedServiceId,
  onServiceChange
}: {
  provider: Provider;
  selectedServiceId: string;
  onServiceChange: (id: string) => void;
}) {
  const selectedService = provider.services.find((service) => service.id === selectedServiceId) ?? provider.services[0];

  return (
    <Card id="bookings">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--brand-dark)]">Booking</p>
            <h2 className="text-xl font-black">Reserve a slot</h2>
          </div>
          <CalendarDays className="h-5 w-5 text-[var(--sage)]" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {provider.services.map((service) => (
            <button
              key={service.id}
              onClick={() => onServiceChange(service.id)}
              className={cn(
                "focus-ring flex items-center justify-between rounded-md border p-3 text-left transition",
                selectedServiceId === service.id ? "border-[var(--brand)] bg-[#fff3f6]" : "border-[var(--line)] bg-white"
              )}
            >
              <span>
                <span className="block text-sm font-black">{service.name}</span>
                <span className="text-xs font-bold text-[var(--muted)]">{service.durationMinutes} min</span>
              </span>
              <span className="text-right text-sm font-black">
                {formatCurrency(service.priceCents)}
                <span className="block text-xs text-[var(--muted)]">{formatCurrency(service.depositCents)} deposit</span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {["09:00", "12:30", "15:30", "17:00"].map((time) => (
            <button key={time} className="focus-ring rounded-md border border-[var(--line)] bg-white py-3 text-sm font-black hover:border-[var(--brand)]">
              {time}
            </button>
          ))}
        </div>

        <Button className="w-full">
          <CreditCard className="h-4 w-4" />
          Pay {formatCurrency(selectedService.depositCents)} deposit
        </Button>
      </CardContent>
    </Card>
  );
}

function OperationsPanel({ provider, deposit }: { provider: Provider; deposit: number }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <Card id="inbox">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Inbox</h2>
            <MessageCircle className="h-5 w-5 text-[var(--brand)]" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-[#f8f0ec] p-3 text-sm">
            <p className="font-black">{provider.name}</p>
            <p className="mt-1 leading-6 text-[var(--muted)]">I can confirm once the {formatCurrency(deposit)} deposit reflects.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Message provider" aria-label="Message provider" />
            <Button size="icon" aria-label="Send message">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-black">Provider studio</h2>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm font-bold text-[var(--muted)]">
          <div className="flex items-center justify-between">
            <span>Portfolio posts</span>
            <span className="text-[var(--ink)]">2 queued</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Calendar sync</span>
            <span className="text-[var(--sage)]">Google + Outlook</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            <span className="text-[var(--sage)]">WhatsApp ready</span>
          </div>
          <Button variant="secondary" className="mt-1 w-full">
            <Store className="h-4 w-4" />
            Open studio
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/94 px-4 py-2 backdrop-blur lg:hidden" aria-label="Mobile">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {[
          [Search, "Discover"],
          [Heart, "Saved"],
          [CalendarDays, "Book"],
          [MessageCircle, "Inbox"]
        ].map(([Icon, label]) => (
          <button key={label as string} className="focus-ring flex h-12 flex-col items-center justify-center gap-1 rounded-md text-xs font-black text-[var(--muted)]">
            <Icon className="h-5 w-5" />
            {label as string}
          </button>
        ))}
      </div>
    </nav>
  );
}
