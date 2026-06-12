"use client";

import { useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Accessibility, ArrowLeft, ArrowUpDown, Award, Baby, Bath, BellRing, CalendarDays, Camera, Car, Check, ChevronLeft, ChevronRight, Clock3, Coffee, Cookie, Droplets, Flame, Gift, GlassWater, Grid3X3, Heart, HeartPulse, Home, Lamp, Layers, Leaf, Loader2, Lock, MapPin, Menu, MessageCircle, Music, Package, PawPrint, Plus, Share2, ShieldCheck, ShowerHead, Sofa, Sparkles, Star, Sun, Thermometer, TreePine, Tv, UserCheck, UserPlus, Users, VolumeX, Wind, Wifi, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { BookingFlow } from "@/components/marketplace/booking-flow";
import { AgentProfilePage } from "@/components/marketplace/agent-profile-page";
import { StickyBookingBar } from "@/components/marketplace/sticky-booking-bar";
import { BookingCalendar } from "@/components/marketplace/booking-calendar";
import { AMENITY_CATEGORIES, AMENITY_MAP } from "@/lib/amenities";

const BOOKING_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  return { h: Math.floor(mins / 60), m: mins % 60, label: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}` };
});
function nextBookingDays(n: number, serviceDurationMinutes = 60): Date[] {
  const out: Date[] = [];
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const skipToday = nowMins >= (18 * 60 - serviceDurationMinutes);
  let added = 0;
  for (let i = 0; added < n; i++) {
    if (i === 0 && skipToday) continue;
    const x = new Date(todayStart); x.setDate(todayStart.getDate() + i); out.push(x); added++;
  }
  return out;
}

type ServiceExtra = { id: string; name: string; description?: string | null; priceCents: number; durationMinutes: number };
type Service = { id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number; performer?: string | null; extras?: ServiceExtra[] };
type Post = { id: string; caption: string; imageUrl: string; images?: string[]; tags: string[]; likes: number; saves: number; featured?: boolean; serviceId?: string | null };
type TeamMember = { id: string; name: string; role: string; avatarUrl: string | null; handle: string; services?: Service[] };
type BookTarget = { id: string; name: string; services: Service[]; preselect: string | null; date?: Date | null; slot?: string | null };

type Profile = {
  id: string; userId?: string; handle: string; businessName: string; name: string;
  category: string; bio: string; city: string; avatarUrl: string | null;
  verified: boolean; verifiedBy?: "GLOWITH" | "EMPLOYER" | null;
  mobile: boolean; studio: boolean; providerType: string;
  parentBusinessName?: string | null; parentBusinessCity?: string | null;
  memberSince: string; appointmentsCompleted: number;
  services: Service[]; posts: Post[]; team?: TeamMember[];
  amenities?: Array<{ key: string; value?: string }>;
};

// ── Amenity icon resolver ────────────────────────────────────────────────────
const AMENITY_ICON_MAP: Record<string, React.ElementType> = {
  Accessibility, ArrowUpDown, Award, Baby, Bath, BellRing, Camera,
  Car, Coffee, Cookie, Droplets, Flame, Gift, GlassWater,
  HeartPulse, Home, Lamp, Layers, Leaf, Lock, MapPin, Music,
  Package, PawPrint, ShieldCheck, ShowerHead, Sofa, Sparkles,
  Sun, Thermometer, TreePine, Tv, Users, VolumeX, Wind, Wifi, Zap
};

function AmenitiesDisplay({ amenities }: { amenities: Array<{ key: string; value?: string }> }) {
  const byCategory = AMENITY_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.amenities.filter((a) => amenities.some((s) => s.key === a.key))
  })).filter((c) => c.items.length > 0);

  if (byCategory.length === 0) return null;

  return (
    <div className="space-y-6">
      {byCategory.map((cat) => (
        <div key={cat.key}>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{cat.label}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cat.items.map((a) => {
              const Icon = AMENITY_ICON_MAP[a.icon] ?? Sparkles;
              const saved = amenities.find((s) => s.key === a.key);
              return (
                <div key={a.key} className="flex items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-white p-3 text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--ink)]">{a.label}</p>
                    {saved?.value && (
                      <p className="text-xs text-[var(--muted)]">{saved.value}{a.valueSuffix ?? ""}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

const IMAGE_FALLBACK_SRC = "/images/glowith-hero.png";

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} hour ${m} mins` : `${h} hour${h > 1 ? "s" : ""}`;
};

export function ProviderProfilePage({ profile, embed = false }: { profile: Profile; embed?: boolean }) {
  const team = profile.team ?? [];
  const isAgent = !!profile.parentBusinessName;
  const isFreelancer = profile.providerType === "FREELANCER";
  // Agents (team members of a business) get the social-style individual profile.
  // Freelancers are standalone providers and use the full business booking layout.
  const isIndividualProfile = isAgent;

  const [book, setBook] = useState<BookTarget | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<"services" | "date" | "time" | "notes">("services");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [extrasConfirmed, setExtrasConfirmed] = useState(false);
  const [busySlots, setBusySlots] = useState<{ start: string; durationMinutes: number }[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [agentPopup, setAgentPopup] = useState<TeamMember | null>(null);
  const [agentProfile, setAgentProfile] = useState<Profile | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [serviceCat, setServiceCat] = useState<string>("All");
  const [showAllServices, setShowAllServices] = useState(false);
  const [docked, setDocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dockSentinel = useRef<HTMLDivElement>(null);

  // Social
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [reviews, setReviews] = useState<{ id: string; stars: number; comment: string | null; name: string; createdAt: string }[]>([]);
  const [myRating, setMyRating] = useState<{ stars: number; comment: string | null } | null>(null);
  const [rateOpen, setRateOpen] = useState(false);

  function loadSocial() {
    fetch(`/api/social/follow?providerProfileId=${profile.id}`).then((r) => r.json())
      .then((d) => { setFollowers(d.followers ?? 0); setFollowing(!!d.following); }).catch(() => {});
    fetch(`/api/social/rate?providerProfileId=${profile.id}`).then((r) => r.json())
      .then((d) => { setRatingAvg(d.avg); setRatingCount(d.count ?? 0); setReviews(d.reviews ?? []); setMyRating(d.mine); }).catch(() => {});
  }
  useEffect(loadSocial, [profile.id]);

  // Dock the business section-nav once the user scrolls past the title block
  useEffect(() => {
    const el = dockSentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting), { rootMargin: "-72px 0px 0px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(profile.services.map((s) => s.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [profile.services]);

  const shownServices = useMemo(() => {
    const filtered = serviceCat === "All" ? profile.services : profile.services.filter((s) => s.category === serviceCat);
    return showAllServices ? filtered : filtered.slice(0, 4);
  }, [profile.services, serviceCat, showAllServices]);

  // Hero/slider: featured posts (up to 10), or the 10 most recent if none featured.
  // Each post appears once in the page hero; tapping it opens that post's carousel.
  const featuredPhotos = profile.posts.filter((p) => p.featured);
  const heroPosts = (featuredPhotos.length ? featuredPhotos : profile.posts).slice(0, 10);
  const heroItems = heroPosts.map((post) => {
    const images = post.images?.length ? post.images : [post.imageUrl];
    return { post, images, src: post.imageUrl || images[0] };
  });
  const galleryImages = heroItems.map((item) => item.src);
  // Photos section excludes featured (shown in the slider) to avoid duplicates
  const gridPhotos = featuredPhotos.length ? profile.posts.filter((p) => !p.featured) : profile.posts;
  const serviceById = new Map(profile.services.map((s) => [s.id, s]));
  const postByServiceId = new Map(profile.posts.filter((p) => p.serviceId).map((p) => [p.serviceId!, p]));
  const [heroIndex, setHeroIndex] = useState(0);
  const heroService = heroItems[heroIndex]?.post.serviceId ? serviceById.get(heroItems[heroIndex].post.serviceId!) : undefined;
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const lightboxTouchStartX = useRef(0);
  const lightboxWheelLocked = useRef(false);
  const openHeroLightbox = (index: number) => {
    const item = heroItems[index];
    if (item) setLightbox({ images: item.images, index: 0 });
  };
  const stepLightbox = (direction: -1 | 1) => {
    setLightbox((lb) => {
      if (!lb) return lb;
      const index = Math.min(Math.max(lb.index + direction, 0), lb.images.length - 1);
      return { ...lb, index };
    });
  };
  const handleLightboxWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!lightbox || Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 12) return;
    event.preventDefault();
    event.stopPropagation();
    if (lightboxWheelLocked.current) return;
    lightboxWheelLocked.current = true;
    stepLightbox(event.deltaX > 0 ? 1 : -1);
    window.setTimeout(() => { lightboxWheelLocked.current = false; }, 280);
  };

  const amenities = profile.amenities ?? [];
  const selectedService = selectedServiceId ? profile.services.find(s => s.id === selectedServiceId) : null;

  const sections = [
    { id: "services", label: "Services" },
    team.length > 0 ? { id: "team", label: "Team" } : null,
    { id: "reviews", label: "Reviews" },
    amenities.length > 0 ? { id: "amenities", label: "Amenities" } : null,
    { id: "about", label: "About" },
    gridPhotos.length > 0 ? { id: "photos", label: "Photos" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  function openBooking(serviceId?: string, date?: Date | null, slot?: string | null) {
    setBook({ id: profile.id, name: profile.businessName, services: profile.services, preselect: serviceId ?? null, date, slot });
  }
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
  // "Back to Glowith" → the apex marketplace (a business subdomain root would loop here)
  function backToGlowith() {
    const host = window.location.host;
    if (host.endsWith(".glowith.co.za")) window.location.href = "https://glowith.co.za/";
    else window.location.href = "/";
  }
  // On mobile, navigate directly to the agent's page; on desktop show the popup.
  function openAgent(m: TeamMember) {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Build the subdomain URL from the provider's handle so this works
      // whether the user is on the subdomain or the apex domain.
      const slug = profile.handle.replace("@", "");
      const host = window.location.host;
      const agentHandle = m.handle.replace("@", "");
      if (host.startsWith(`${slug}.`)) {
        window.location.href = `/team/${agentHandle}`;
      } else {
        // Derive the apex domain: if host has a subdomain matching slug, strip it;
        // otherwise host is already the apex (e.g. "glowith.co.za").
        const parts = host.split(".");
        const apexDomain = parts[0] === slug ? parts.slice(1).join(".") : host;
        window.location.href = `https://${slug}.${apexDomain}/team/${agentHandle}`;
      }
      return;
    }
    setAgentPopup(m);
    setAgentProfile(null);
    setAgentLoading(true);
    fetch(`/api/providers/profile?id=${m.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.profile) setAgentProfile(d.profile); })
      .finally(() => setAgentLoading(false));
  }
  function requireSignIn(): boolean {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
    return true;
  }

  // Load availability when date is selected for inline booking
  useEffect(() => {
    if (!selectedDate) return;
    setBusySlots([]);
    setBusyLoading(true);
    const ds = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${profile.id}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => setBusySlots(d.busy ?? []))
      .catch(() => {})
      .finally(() => setBusyLoading(false));
  }, [selectedDate, profile.id]);

  const selectedServiceDuration = selectedServiceId ? (profile.services.find(s => s.id === selectedServiceId)?.durationMinutes ?? 0) : 0;

  function isSlotDisabled(hhmm: string): boolean {
    if (!selectedDate || selectedServiceDuration === 0) return true;
    const [hh, mm] = hhmm.split(":").map(Number);
    const start = new Date(selectedDate); start.setHours(hh, mm, 0, 0);
    if (start.getTime() < Date.now()) return true;
    if (hh * 60 + mm + selectedServiceDuration > 18 * 60) return true;
    const end = start.getTime() + selectedServiceDuration * 60000;
    return busySlots.some((b) => {
      const bs = new Date(b.start).getTime(); const be = bs + b.durationMinutes * 60000;
      return start.getTime() < be && end > bs;
    });
  }
  async function toggleFollow() {
    setFollowBusy(true);
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerProfileId: profile.id })
      });
      if (res.status === 401) { requireSignIn(); return; }
      const d = await res.json();
      setFollowing(!!d.following);
      setFollowers((n) => n + (d.following ? 1 : -1));
      if (d.alsoFollowedCompany) alert(`You're now following ${profile.parentBusinessName} too — agents are part of their company.`);
    } finally {
      setFollowBusy(false);
    }
  }

  const renderCommonOverlays = () => (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-[68] flex touch-none flex-col overscroll-none bg-black/95"
          onClick={() => setLightbox(null)}
          onWheel={handleLightboxWheel}
          onTouchStart={(e) => { lightboxTouchStartX.current = e.touches[0].clientX; }}
          onTouchMove={(e) => {
            const dx = e.touches[0].clientX - lightboxTouchStartX.current;
            if (Math.abs(dx) > 8) e.preventDefault();
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - lightboxTouchStartX.current;
            if (dx > 50) stepLightbox(-1);
            else if (dx < -50) stepLightbox(1);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-bold text-white/80">{Math.min(lightbox.index + 1, lightbox.images.length)} / {lightbox.images.length}</span>
            <button onClick={() => setLightbox(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"><X className="h-5 w-5" /></button>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="relative flex flex-1 items-center justify-center overflow-hidden">
            <LightboxPhoto key={`${lightbox.index}-${lightbox.images[lightbox.index]}`} src={lightbox.images[lightbox.index]} alt={`Photo ${lightbox.index + 1}`} />
          </div>
          {lightbox.images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                disabled={lightbox.index === 0}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35 sm:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                disabled={lightbox.index === lightbox.images.length - 1}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35 sm:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {lightbox.images.length > 1 && (
            <div className="flex justify-center gap-1.5 py-4" onClick={(e) => e.stopPropagation()}>
              {lightbox.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox((lb) => lb ? { ...lb, index: i } : lb)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === lightbox.index ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BookingFlow
        open={!!book}
        onClose={() => { setBook(null); }}
        onSuccess={() => { setBook(null); setSelectedServiceId(null); setBookingStep("services"); setSelectedDate(null); setSelectedSlot(null); setNotes(""); }}
        providerProfileId={book?.id ?? profile.id}
        providerName={book?.name ?? profile.businessName}
        services={book?.services ?? profile.services}
        preselectedServiceId={book?.preselect ?? null}
        preselectedDate={book?.date ?? null}
        preselectedSlot={book?.slot ?? null}
        startStep={book?.date && book?.slot ? "review" : undefined}
      />

      {rateOpen && (
        <RateModal
          providerProfileId={profile.id}
          providerName={profile.businessName}
          isAgent={isAgent}
          businessName={profile.parentBusinessName ?? null}
          initial={myRating}
          onClose={() => setRateOpen(false)}
          onSaved={() => { setRateOpen(false); loadSocial(); }}
          onNeedSignIn={requireSignIn}
        />
      )}
    </>
  );

  if (isIndividualProfile) {
    const displayHandle = profile.handle.startsWith("@") ? profile.handle.slice(1) : profile.handle;
    const serviceTiles = profile.services.map((service) => {
      const post = postByServiceId.get(service.id);
      const fallbackPost = profile.posts[0];
      return {
        service,
        post,
        image: post?.imageUrl ?? fallbackPost?.imageUrl ?? profile.avatarUrl ?? IMAGE_FALLBACK_SRC,
        images: post?.images?.length ? post.images : post ? [post.imageUrl] : []
      };
    });
    const serviceCategories = Array.from(new Set(profile.services.map((s) => s.category).filter(Boolean))).slice(0, 8);

    return (
      <div className="min-h-screen bg-white">
        {!embed && (
          <header className="sticky top-0 z-40 border-b border-[var(--line)]/70 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex h-[4.25rem] max-w-5xl items-center gap-3 px-4 sm:px-6">
              <button onClick={backToGlowith} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--background)]">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <p className="min-w-0 truncate text-lg font-black">@{displayHandle}</p>
              <div className="ml-auto flex items-center gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--background)]" aria-label="Share">
                  <Share2 className="h-5 w-5 text-[var(--muted)]" />
                </button>
                <button onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--background)]" aria-label="Menu">
                  <Menu className="h-5 w-5 text-[var(--ink)]" />
                </button>
              </div>
            </div>
          </header>
        )}

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)} />
            <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-1 bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="truncate text-sm font-black">@{displayHandle}</p>
                <button onClick={() => setMenuOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[var(--muted)]" /></button>
              </div>
              <button onClick={() => { setMenuOpen(false); openBooking(); }} className="rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[var(--background)]">Book a service</button>
              <button onClick={() => { setMenuOpen(false); setRateOpen(true); }} className="rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[var(--background)]">Write a review</button>
              <Link href="/" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]">Discover on Glowith</Link>
              <a href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]">Log in</a>
            </div>
          </>
        )}

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <section className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
            <div className="flex justify-center sm:block">
              <div className="rounded-full bg-gradient-to-tr from-[#f9b233] via-[var(--brand)] to-[#8f38ff] p-1.5">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#fce8f0] to-[#fde8dc] sm:h-40 sm:w-40">
                  {profile.avatarUrl ? (
                    <PortfolioImage src={profile.avatarUrl} alt={profile.businessName} fill sizes="160px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-5xl font-black text-[var(--brand)]">{profile.businessName[0]}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black sm:text-3xl">{profile.businessName}</h1>
                {profile.verified && <VerifiedBadge verifiedBy={profile.verifiedBy ?? "GLOWITH"} employerName={profile.parentBusinessName} />}
              </div>

              <div className="mt-5 grid max-w-xl grid-cols-3 gap-4 text-center sm:text-left">
                <div>
                  <p className="text-2xl font-black">{profile.services.length}</p>
                  <p className="text-sm text-[var(--muted)]">services</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{followers}</p>
                  <p className="text-sm text-[var(--muted)]">followers</p>
                </div>
                <button onClick={() => setRateOpen(true)} className="text-center sm:text-left">
                  <p className="text-2xl font-black">{ratingCount}</p>
                  <p className="text-sm text-[var(--muted)]">reviews</p>
                </button>
              </div>

              <div className="mt-5 space-y-1">
                <p className="font-black">{profile.name || profile.businessName}</p>
                <p className="text-sm font-semibold text-[var(--muted)]">{isAgent && profile.parentBusinessName ? `${profile.category} at ${profile.parentBusinessName}` : profile.category}</p>
                {profile.bio && <p className="max-w-2xl whitespace-pre-line text-sm leading-6 text-[var(--ink)]">{profile.bio}</p>}
                <p className="flex items-center gap-1 text-sm text-[var(--muted)]"><MapPin className="h-3.5 w-3.5" />{profile.city}</p>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_1fr_auto] gap-2">
                <button onClick={() => openBooking()} className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[var(--brand-dark)]">
                  Book
                </button>
                <button onClick={toggleFollow} disabled={followBusy} className={cn("rounded-xl px-5 py-3 text-sm font-black transition disabled:opacity-60", following ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-[var(--ink)] text-white")}>
                  {following ? "Following" : "Follow"}
                </button>
                <button
                  onClick={async () => {
                    if (!profile.userId) return;
                    const res = await fetch("/api/conversations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ recipientId: profile.userId, body: `Hi ${profile.businessName}! I'd like to get in touch.` })
                    });
                    if (res.status === 401) { requireSignIn(); return; }
                    if (res.ok) {
                      const data = await res.json();
                      window.location.href = `/dashboard/inbox?conversation=${data.conversationId}`;
                    }
                  }}
                  aria-label="Message"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--ink)] hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

          {serviceCategories.length > 0 && (
            <section className="mt-8 overflow-x-auto pb-2">
              <div className="flex gap-4">
                {serviceCategories.map((category) => (
                  <button key={category} onClick={() => scrollTo("individual-services")} className="w-24 shrink-0 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[6px] border-[#68717c] bg-[var(--background)] text-lg font-black text-[var(--brand)]">
                      {category[0]}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{category}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <nav className="mt-6 grid grid-cols-3 border-t border-[var(--line)] text-center">
            <button onClick={() => scrollTo("individual-services")} className="flex items-center justify-center gap-2 border-t-2 border-[var(--ink)] py-4 text-sm font-black">
              <Grid3X3 className="h-4 w-4" /> Services
            </button>
            <button onClick={() => setRateOpen(true)} className="py-4 text-sm font-bold text-[var(--muted)]">Reviews</button>
            <button onClick={() => openBooking()} className="py-4 text-sm font-bold text-[var(--muted)]">Book</button>
          </nav>

          <section id="individual-services" className="scroll-mt-24">
            <div className="space-y-3">
              {profile.services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(isSelected ? null : service.id);
                      setBookingStep("services");
                      setNotes("");
                    }}
                    className={cn(
                      "w-full rounded-2xl border px-5 py-4 text-left shadow-sm transition",
                      isSelected
                        ? "border-[var(--brand)] bg-[#FFF0F4]"
                        : "border-[var(--line)] bg-white hover:border-[var(--brand)]/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{service.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <Clock3 className="h-3 w-3" />
                          {formatDuration(service.durationMinutes)}
                        </p>
                        <p className="mt-1 text-sm font-black">{formatZAR(service.priceCents)}</p>
                      </div>
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                        isSelected ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--line)]"
                      )}>
                        {isSelected && <span className="block h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {profile.services.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--line)] py-14 text-center text-sm text-[var(--muted)]">No services listed yet</div>
              )}
            </div>

            {/* Step 2: Date picker */}
            <AnimatePresence>
              {selectedServiceId && bookingStep !== "services" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black">Pick a date</h3>
                    <button onClick={() => { setBookingStep("services"); setSelectedDate(null); setSelectedSlot(null); setNotes(""); }} className="text-xs font-bold text-[var(--brand)] hover:underline">Back</button>
                  </div>
                  <BookingCalendar
                    providerProfileId={profile.id}
                    serviceDuration={selectedServiceDuration || 30}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => { setSelectedDate(d); setSelectedSlot(null); setBookingStep("time"); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Time slots */}
            <AnimatePresence>
              {selectedServiceId && (bookingStep === "time" || bookingStep === "notes") && selectedDate && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black">Choose a time</h3>
                    <button onClick={() => { setBookingStep("date"); setSelectedSlot(null); }} className="text-xs font-bold text-[var(--brand)] hover:underline">Change date</button>
                  </div>
                  {busyLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" /></div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {BOOKING_SLOTS.map((s) => {
                        const disabled = isSlotDisabled(s.label);
                        const sel = selectedSlot === s.label;
                        return (
                          <button key={s.label} disabled={disabled} onClick={() => { setSelectedSlot(s.label); setBookingStep("notes"); }}
                            className={cn("rounded-xl border py-2.5 text-sm font-bold transition",
                              sel ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                : disabled ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/30 text-[var(--muted)]/40"
                                : "border-[var(--line)] bg-white hover:border-[var(--brand)]")}>
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-center text-xs text-[var(--muted)]">Duration: {formatDuration(selectedServiceDuration)}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 4: Notes then confirm */}
            <AnimatePresence>
              {selectedServiceId && bookingStep === "notes" && selectedDate && selectedSlot && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                  className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                  <h3 className="mb-3 font-black">Any notes or requests?</h3>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                    placeholder="Allergies, preferences or special requests"
                    className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                  <button onClick={() => openBooking(selectedServiceId ?? undefined, selectedDate, selectedSlot)}
                    className="mt-3 w-full rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white shadow-sm hover:bg-[var(--brand-dark)]">
                    Review &amp; confirm
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Initial Continue — shown only at service step */}
            <AnimatePresence>
              {selectedServiceId && bookingStep === "services" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-4">
                  <button onClick={() => { setSelectedDate(null); setSelectedSlot(null); setBookingStep("date"); }}
                    className="w-full rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white shadow-sm hover:bg-[var(--brand-dark)]">
                    Choose date &amp; time
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        {renderCommonOverlays()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Sticky top bar (hidden when embedded in a popup) ── */}
      {!embed && (
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-[90rem] items-center gap-3 px-4 sm:px-6">
          <button onClick={backToGlowith} aria-label="Back" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {/* Provider name */}
          <p className="min-w-0 shrink truncate text-base font-black">{profile.businessName}</p>

          {/* Docked business section nav (desktop) */}
          {docked && (
            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
              {sections.map((s) => (
                <button key={s.id} onClick={() => s.id === "photos" ? setPhotoGalleryOpen(true) : scrollTo(s.id)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]">
                  {s.label}
                </button>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Share">
              <Share2 className="h-4 w-4 text-[var(--muted)]" />
            </button>
            <button onClick={toggleFollow} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Save">
              <Heart className={cn("h-4 w-4", following ? "fill-[var(--brand)] text-[var(--brand)]" : "text-[var(--muted)]")} />
            </button>
            {/* Global menu → hamburger on the right */}
            <button onClick={() => setMenuOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Menu">
              <Menu className="h-4 w-4 text-[var(--ink)]" />
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Global menu drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-1 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="truncate text-sm font-black">{profile.businessName}</p>
              <button onClick={() => setMenuOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[var(--muted)]" /></button>
            </div>
            {/* This provider's sections */}
            {sections.map((s) => (
              <button key={s.id} onClick={() => { setMenuOpen(false); scrollTo(s.id); }}
                className="rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[var(--background)]">{s.label}</button>
            ))}
            <div className="my-2 border-t border-[var(--line)]" />
            <Link href="/" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]">Discover on Glowith</Link>
            <a href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]">Log in</a>
            <a href="/business" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]">List your business</a>
          </div>
        </>
      )}

      {/* ── Mobile hero photo slider (featured, or 5 most recent) ── */}
      {heroItems.length > 0 && (
        <div className="relative sm:hidden">
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              setHeroIndex(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-x"
          >
            {heroItems.map((item, i) => (
              <button key={item.post.id} onClick={() => setLightbox({ images: item.images, index: 0 })} className="relative block aspect-[4/3] w-full shrink-0 snap-center bg-[#f3e8e4]">
                <PortfolioImage src={item.src} alt={`${profile.businessName} ${i + 1}`} fill sizes="100vw" className="object-cover" priority={i === 0} />
                {item.images.length > 1 && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white">
                    <Layers className="h-3.5 w-3.5" /> {item.images.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* counter */}
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
            {Math.min(heroIndex + 1, heroItems.length)}/{heroItems.length}
          </div>
          {/* Book the linked service for the current photo */}
          {heroService && (
            <button onClick={() => openBooking(heroService.id)}
              className="absolute bottom-3 left-3 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-black text-white shadow-lg">
              Book · {formatZAR(heroService.priceCents)}
            </button>
          )}
          {/* dots */}
          {heroItems.length > 1 && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {heroItems.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === heroIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6">
        {/* ── Hero gallery (portfolio) — desktop only ── */}
        <div className="hidden gap-2 sm:grid sm:grid-cols-3 sm:grid-rows-2">
          <button onClick={() => openHeroLightbox(0)} className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#f3e8e4] text-left sm:col-span-2 sm:row-span-2 sm:aspect-auto">
            {galleryImages[0] ? (
              <PortfolioImage src={galleryImages[0]} alt={profile.businessName} fill sizes="(max-width:640px) 100vw, 66vw" className="object-cover" />
            ) : <GalleryPlaceholder name={profile.businessName} />}
            {(heroItems[0]?.images.length ?? 0) > 1 && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
                <Layers className="h-3.5 w-3.5" /> {heroItems[0].images.length}
              </span>
            )}
          </button>
          {[1, 2].map((i) => (
            <button key={i} onClick={() => openHeroLightbox(i)} className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl bg-[#f3e8e4] text-left sm:block">
              {galleryImages[i] ? (
                <PortfolioImage src={galleryImages[i]} alt={`${profile.businessName} ${i}`} fill sizes="33vw" className="object-cover" />
              ) : <GalleryPlaceholder name={profile.businessName} />}
              {(heroItems[i]?.images.length ?? 0) > 1 && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white">
                  <Layers className="h-3.5 w-3.5" /> {heroItems[i].images.length}
                </span>
              )}
              {i === 2 && gridPhotos.length > 0 && (
                <span onClick={(e) => { e.stopPropagation(); setPhotoGalleryOpen(true); }}
                  className="absolute bottom-3 right-3 rounded-full bg-white/95 px-4 py-2 text-xs font-bold shadow hover:bg-white cursor-pointer">
                  See all photos
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Title block ── */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black sm:text-4xl">{profile.businessName}</h1>
            {profile.verified && <VerifiedBadge verifiedBy={profile.verifiedBy ?? "GLOWITH"} employerName={profile.parentBusinessName} />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <button onClick={() => scrollTo("reviews")} className="flex items-center gap-1.5 font-bold">
              <span>{ratingAvg != null ? ratingAvg.toFixed(1) : "New"}</span>
              <span className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={cn("h-4 w-4", ratingAvg != null && i < Math.round(ratingAvg) ? "fill-amber-400 text-amber-400" : "text-[var(--line)]")} />)}</span>
              <span className="font-semibold text-[var(--brand)]">({ratingCount})</span>
            </button>
            <span className="text-[var(--muted)]">·</span>
            <span className="text-[var(--muted)]">{profile.category}</span>
            <span className="text-[var(--muted)]">·</span>
            <span className="flex items-center gap-1 text-[var(--muted)]"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>
          </div>
        </div>

        {/* Inline section nav (docks into the top bar on scroll — see header) */}
        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--line)] py-2">
          {sections.map((s) => (
            <button key={s.id} onClick={() => s.id === "photos" ? setPhotoGalleryOpen(true) : scrollTo(s.id)}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]">
              {s.label}
            </button>
          ))}
        </nav>
        {/* Sentinel placed just below the inline nav — once it scrolls under the
            sticky header, the section nav docks into the top bar. */}
        <div ref={dockSentinel} className="h-px" />

        {/* ── Main + sidebar ── */}
        <div className="mt-6 lg:flex lg:gap-8">
          <main className="min-w-0 flex-1 space-y-10">

            {/* Services — selectable cards + in-place booking steps */}
            <section id="services" className="scroll-mt-28">
              <h2 className="mb-4 text-xl font-black">Services</h2>
              {categories.length > 1 && (
                <div className="mb-4 flex gap-2 overflow-x-auto">
                  {categories.map((c) => (
                    <button key={c} onClick={() => { setServiceCat(c); setShowAllServices(false); }}
                      className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
                        serviceCat === c ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]")}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {shownServices.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(isSelected ? null : service.id);
                        setBookingStep("services");
                        setSelectedDate(null);
                        setSelectedSlot(null);
                        setNotes("");
                      }}
                      className={cn(
                        "w-full rounded-2xl border px-5 py-4 text-left shadow-sm transition",
                        isSelected
                          ? "border-[var(--brand)] bg-[#FFF0F4]"
                          : "border-[var(--line)] bg-white hover:border-[var(--brand)]/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{service.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                            <Clock3 className="h-3 w-3" />
                            {formatDuration(service.durationMinutes)}
                            {service.performer ? ` · with ${service.performer}` : ""}
                          </p>
                          <p className="mt-1 text-sm font-black">{formatZAR(service.priceCents)}</p>
                        </div>
                        <div className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                          isSelected ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--line)]"
                        )}>
                          {isSelected && <span className="block h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!showAllServices && (serviceCat === "All" ? profile.services.length : profile.services.filter((s) => s.category === serviceCat).length) > 4 && (
                  <button onClick={() => setShowAllServices(true)} className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--ink)] hover:border-[var(--brand)]">
                    See all
                  </button>
                )}
                {profile.services.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">No services listed yet</div>
                )}
              </div>

            </section>

            {/* Team */}
            {team.length > 0 && (
              <section id="team" className="scroll-mt-28">
                <h2 className="mb-4 text-xl font-black">Team</h2>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                  {team.map((m) => (
                    <button key={m.id} type="button" onClick={() => openAgent(m)} className="group text-center">
                      <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-[var(--line)] bg-gradient-to-br from-[#fce8f0] to-[#fde8dc]">
                        {m.avatarUrl ? (
                          <Image src={m.avatarUrl} alt={m.name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-2xl font-black text-[var(--brand)]">{m.name[0]}</span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-bold group-hover:text-[var(--brand)]">{m.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{m.role}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section id="reviews" className="scroll-mt-28">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Reviews</h2>
                <button onClick={() => setRateOpen(true)} className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">
                  {myRating ? "Edit your rating" : "Write a review"}
                </button>
              </div>
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-5">
                <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
                <span className="text-2xl font-black">{ratingAvg != null ? ratingAvg.toFixed(1) : "—"}</span>
                <span className="text-sm text-[var(--muted)]">{ratingCount} rating{ratingCount !== 1 ? "s" : ""}</span>
              </div>
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{r.name}</span>
                        <span className="flex items-center gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < r.stars ? "fill-amber-400 text-amber-400" : "text-[var(--line)]")} />)}</span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-[var(--muted)]">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">No reviews yet — be the first to rate {profile.businessName}.</p>
              )}
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section id="amenities" className="scroll-mt-28">
                <h2 className="mb-4 text-xl font-black">What this studio offers</h2>
                <AmenitiesDisplay amenities={amenities} />
              </section>
            )}

            {/* About */}
            <section id="about" className="scroll-mt-28">
              <h2 className="mb-4 text-xl font-black">About</h2>
              <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                {profile.bio && <p className="text-sm leading-6 text-[var(--muted)]">{profile.bio}</p>}
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" />
                  <div>
                    <p className="font-bold">{profile.city}</p>
                    {profile.mobile && <p className="mt-1 text-xs font-semibold text-[var(--brand)]">Also offers mobile / home visits</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                  {profile.mobile && <span className="rounded-full bg-[#FFF0F4] px-2.5 py-1 text-xs font-semibold text-[var(--brand)]">Mobile</span>}
                  {profile.studio && <span className="rounded-full bg-[#F0FFF4] px-2.5 py-1 text-xs font-semibold text-emerald-600">Studio</span>}
                  {isAgent ? (
                    <span className="rounded-full bg-[#F0FFF4] px-2.5 py-1 text-xs font-semibold text-emerald-600">Agent · {profile.parentBusinessName}</span>
                  ) : profile.providerType === "FREELANCER" ? (
                    <span className="rounded-full bg-[#FFF8E7] px-2.5 py-1 text-xs font-semibold text-amber-600">Freelancer</span>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--muted)]">Member since {format(new Date(profile.memberSince), "MMMM yyyy")}</p>
              </div>
            </section>

            {/* Photos — moved to end */}
            {gridPhotos.length > 0 && (
              <section id="photos" className="scroll-mt-28">
                <h2 className="mb-4 text-xl font-black">Photos</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gridPhotos.map((post) => {
                    const svc = post.serviceId ? serviceById.get(post.serviceId) : undefined;
                    const imgs = post.images?.length ? post.images : [post.imageUrl];
                    return (
                    <div key={post.id} className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
                      <button onClick={() => setLightbox({ images: imgs, index: 0 })} className="relative block aspect-square w-full bg-[#f3e8e4]">
                        <PortfolioImage src={post.imageUrl} alt={post.caption} fill sizes="300px" className="object-cover" />
                        {imgs.length > 1 && (
                          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            <Layers className="h-3 w-3" /> {imgs.length}
                          </span>
                        )}
                        {svc && (
                          <span onClick={(e) => { e.stopPropagation(); openBooking(svc.id); }}
                            className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-black text-white shadow-md transition hover:bg-[var(--brand-dark)]">
                            Book · {formatZAR(svc.priceCents)}
                          </span>
                        )}
                      </button>
                      <div className="p-3">
                        <p className="line-clamp-1 text-xs font-semibold">{post.caption}</p>
                        {svc ? (
                          <p className="mt-1 text-[10px] font-semibold text-[var(--brand)]">{svc.name}</p>
                        ) : (
                          <p className="mt-1 text-[10px] text-[var(--muted)]">♥ {post.likes} · ⊕ {post.saves}</p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            )}
          </main>

          {/* ── Sticky sidebar — static or dynamic cart ── */}
          <aside className="mt-8 lg:mt-0 lg:w-96 lg:shrink-0">
            <div className="sticky top-[6rem] rounded-2xl border border-[var(--line)] bg-white shadow-sm overflow-hidden max-h-[calc(100dvh-8rem)] overflow-y-auto">
              <AnimatePresence mode="wait">
                {!selectedService ? (
                  <motion.div
                    key="empty-cart"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-6"
                  >
                    <h2 className="text-lg font-black">{profile.businessName}</h2>
                    <button onClick={() => scrollTo("reviews")} className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {ratingAvg != null ? ratingAvg.toFixed(1) : "New"}
                      <span className="font-semibold text-[var(--brand)]">({ratingCount})</span>
                    </button>
                    <button onClick={() => openBooking()} className="mt-4 w-full rounded-xl bg-[var(--ink)] py-3.5 text-sm font-bold text-white transition hover:bg-[var(--ink)]/90">
                      Book now
                    </button>
                    <button onClick={toggleFollow} disabled={followBusy}
                      className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition disabled:opacity-60",
                        following ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)] hover:border-[var(--brand)]")}>
                      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      {following ? "Following" : "Follow"}
                      <span className="text-xs font-semibold text-[var(--muted)]">· {followers}</span>
                    </button>
                    <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-4 text-sm">
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" /><span className="text-[var(--muted)]">{profile.city}</span></div>
                      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--sage)]" /><span className="text-xs font-semibold text-[var(--muted)]">Book online to confirm instantly</span></div>
                      {isAgent && (
                        <div className="rounded-xl bg-[var(--background)] p-3 text-xs text-[var(--muted)]">Works at <span className="font-bold text-[var(--ink)]">{profile.parentBusinessName}</span></div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="with-service"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Service pill — always visible */}
                    <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{selectedService.name}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <Clock3 className="h-3 w-3" />{formatDuration(selectedService.durationMinutes)}
                          <span className="mx-1">·</span>
                          <span className="font-bold text-[var(--ink)]">{formatZAR(selectedService.priceCents)}</span>
                        </p>
                      </div>
                      <button onClick={() => { setSelectedServiceId(null); setBookingStep("services"); setSelectedDate(null); setSelectedSlot(null); setNotes(""); }}
                        className="ml-3 shrink-0 text-xs font-bold text-[var(--brand)] hover:underline">
                        Change
                      </button>
                    </div>

                    {/* Steps — each replaces the previous (mode="wait") */}
                    <AnimatePresence mode="wait">
                      {/* STEP: date */}
                      {!selectedDate && (
                        <motion.div key="step-date"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }} className="px-5 py-4">
                          <p className="mb-3 text-sm font-black">Pick a date</p>
                          <BookingCalendar
                            providerProfileId={profile.id}
                            serviceDuration={selectedServiceDuration || 30}
                            selectedDate={selectedDate}
                            onSelectDate={(d) => { setSelectedDate(d); setSelectedSlot(null); setBookingStep("time"); }}
                          />
                        </motion.div>
                      )}

                      {/* STEP: time */}
                      {selectedDate && !selectedSlot && (
                        <motion.div key="step-time"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }} className="px-5 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <button onClick={() => { setSelectedDate(null); setSelectedSlot(null); setBookingStep("date"); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <p className="text-sm font-black">
                              {selectedDate.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                          </div>
                          {busyLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" /></div>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              {BOOKING_SLOTS.map((s) => {
                                const disabled = isSlotDisabled(s.label);
                                const sel = selectedSlot === s.label;
                                return (
                                  <button key={s.label} disabled={disabled}
                                    onClick={() => { setSelectedSlot(s.label); setSelectedExtraIds([]); setExtrasConfirmed(false); setBookingStep("notes"); }}
                                    className={cn("rounded-xl border py-2 text-xs font-bold transition",
                                      sel ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                        : disabled ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/20 text-[var(--muted)]/40"
                                        : "border-[var(--line)] bg-white hover:border-[var(--brand)]")}>
                                    {s.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* STEP: extras (only when service has extras, slot picked, not yet confirmed) */}
                      {selectedDate && selectedSlot && (selectedService.extras?.length ?? 0) > 0 && !extrasConfirmed && (
                        <motion.div key="step-extras"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }} className="px-5 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <button onClick={() => { setSelectedSlot(null); setBookingStep("time"); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <p className="text-sm font-black">Optional extras</p>
                          </div>
                          <div className="space-y-2">
                            {selectedService.extras!.map((e) => {
                              const checked = selectedExtraIds.includes(e.id);
                              return (
                                <button key={e.id} onClick={() => setSelectedExtraIds((prev) => checked ? prev.filter((id) => id !== e.id) : [...prev, e.id])}
                                  className={cn("flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition",
                                    checked ? "border-[var(--brand)]/50 bg-[var(--brand)]/5" : "border-[var(--line)] bg-white hover:border-[var(--brand)]/40")}>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold">{e.name}</p>
                                    {e.description && <p className="text-xs text-[var(--muted)]">{e.description}</p>}
                                    <p className="text-xs text-[var(--muted)]">
                                      {e.priceCents > 0 ? `+${formatZAR(e.priceCents)}` : "Free"}
                                      {e.durationMinutes > 0 ? ` · +${e.durationMinutes} min` : ""}
                                    </p>
                                  </div>
                                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
                                    checked ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] text-[var(--muted)]")}>
                                    {checked ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <button onClick={() => setExtrasConfirmed(true)}
                            className="mt-4 w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-black text-white hover:opacity-90">
                            Continue
                          </button>
                        </motion.div>
                      )}

                      {/* STEP: inline booking flow (auth → review → pay → done) */}
                      {selectedDate && selectedSlot && (extrasConfirmed || (selectedService.extras?.length ?? 0) === 0) && (
                        <motion.div key="step-flow"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }}>
                          <BookingFlow
                            open
                            inline
                            onClose={() => { setExtrasConfirmed(false); setSelectedExtraIds([]); }}
                            onSuccess={() => { setSelectedServiceId(null); setBookingStep("services"); setSelectedDate(null); setSelectedSlot(null); setSelectedExtraIds([]); setExtrasConfirmed(false); setNotes(""); }}
                            providerProfileId={profile.id}
                            providerName={profile.businessName}
                            services={profile.services}
                            preselectedServiceId={selectedService.id}
                            preselectedDate={selectedDate}
                            preselectedSlot={selectedSlot}
                            preselectedExtraIds={selectedExtraIds}
                            startStep="review"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Full-page photo gallery modal ── */}
      {photoGalleryOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur-md">
            <h2 className="text-base font-black">All photos · {profile.businessName}</h2>
            <button
              onClick={() => setPhotoGalleryOpen(false)}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]"
            >
              <X className="h-5 w-5 text-[var(--muted)]" />
            </button>
          </div>
          <div className="columns-2 gap-3 p-4 sm:columns-3 sm:gap-4 sm:p-6">
            {profile.posts.map((post) => {
              const imgs = post.images?.length ? post.images : [post.imageUrl];
              return (
                <div key={post.id} className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm sm:mb-4">
                  <button
                    onClick={() => { setPhotoGalleryOpen(false); setLightbox({ images: imgs, index: 0 }); }}
                    className="relative block w-full bg-[#f3e8e4]"
                  >
                    <PortfolioImage
                      src={post.imageUrl}
                      alt={post.caption}
                      width={600}
                      height={600}
                      className="w-full object-cover"
                    />
                  </button>
                  <div className="p-3">
                    {post.caption && <p className="text-xs font-semibold text-[var(--ink)]">{post.caption}</p>}
                    {post.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carousel lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[68] flex touch-none flex-col overscroll-none bg-black/95"
          onClick={() => setLightbox(null)}
          onWheel={handleLightboxWheel}
          onTouchStart={(e) => { lightboxTouchStartX.current = e.touches[0].clientX; }}
          onTouchMove={(e) => {
            const dx = e.touches[0].clientX - lightboxTouchStartX.current;
            if (Math.abs(dx) > 8) e.preventDefault();
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - lightboxTouchStartX.current;
            if (dx > 50) stepLightbox(-1);
            else if (dx < -50) stepLightbox(1);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-bold text-white/80">{Math.min(lightbox.index + 1, lightbox.images.length)} / {lightbox.images.length}</span>
            <button onClick={() => setLightbox(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"><X className="h-5 w-5" /></button>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-1 items-center justify-center overflow-hidden"
          >
            <LightboxPhoto
              key={`${lightbox.index}-${lightbox.images[lightbox.index]}`}
              src={lightbox.images[lightbox.index]}
              alt={`Photo ${lightbox.index + 1}`}
            />
          </div>
          {lightbox.images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                disabled={lightbox.index === 0}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35 sm:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                disabled={lightbox.index === lightbox.images.length - 1}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35 sm:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {lightbox.images.length > 1 && (
            <div className="flex justify-center gap-1.5 py-4" onClick={(e) => e.stopPropagation()}>
              {lightbox.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox((lb) => lb ? { ...lb, index: i } : lb)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === lightbox.index ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BookingFlow
        open={!!book}
        onClose={() => { setBook(null); }}
        onSuccess={() => { setBook(null); setSelectedServiceId(null); setBookingStep("services"); setSelectedDate(null); setSelectedSlot(null); setNotes(""); }}
        providerProfileId={book?.id ?? profile.id}
        providerName={book?.name ?? profile.businessName}
        services={book?.services ?? profile.services}
        preselectedServiceId={book?.preselect ?? null}
        preselectedDate={book?.date ?? null}
        preselectedSlot={book?.slot ?? null}
        startStep={book?.date && book?.slot ? "review" : undefined}
      />

      {/* ── Mobile sticky booking bar ── */}
      <StickyBookingBar
        service={selectedService ?? null}
        providerProfileId={profile.id}
        hidden={!!book}
        onClear={() => { setSelectedServiceId(null); setBookingStep("services"); setSelectedDate(null); setSelectedSlot(null); setNotes(""); }}
      />

      {/* Agent full profile in a popup (rendered natively) */}
      {agentPopup && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-2 sm:p-4"
          onClick={() => { setAgentPopup(null); setAgentProfile(null); }}>
          <div className="relative flex h-full max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
              <p className="text-sm font-black">{agentPopup.name} · {agentPopup.role}</p>
              <button onClick={() => { setAgentPopup(null); setAgentProfile(null); }} aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {agentLoading || !agentProfile ? (
                <div className="flex h-full items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" /></div>
              ) : (
                <AgentProfilePage profile={{
                  id: agentProfile.id,
                  userId: agentProfile.userId ?? "",
                  handle: agentProfile.handle,
                  businessName: agentProfile.businessName,
                  name: agentProfile.name,
                  category: agentProfile.category,
                  bio: agentProfile.bio,
                  city: agentProfile.city,
                  avatarUrl: agentProfile.avatarUrl,
                  verified: agentProfile.verified,
                  verifiedBy: agentProfile.verifiedBy ?? undefined,
                  memberSince: agentProfile.memberSince,
                  appointmentsCompleted: agentProfile.appointmentsCompleted,
                  followerCount: 0,
                  followingCount: 0,
                  reviewCount: 0,
                  averageRating: 0,
                  parentBusinessName: profile.businessName,
                  parentBusinessHandle: profile.handle,
                  parentBusinessCity: profile.city,
                  parentBusinessAvatarUrl: profile.avatarUrl,
                  parentBusinessVerified: profile.verified,
                  employmentConfirmed: true,
                  services: agentProfile.services,
                  posts: agentProfile.posts.map((p) => ({ ...p, images: p.images ?? [], featured: p.featured ?? false })),
                }} />
              )}
            </div>
          </div>
        </div>
      )}

      {rateOpen && (
        <RateModal
          providerProfileId={profile.id}
          providerName={profile.businessName}
          isAgent={isAgent}
          businessName={profile.parentBusinessName ?? null}
          initial={myRating}
          onClose={() => setRateOpen(false)}
          onSaved={() => { setRateOpen(false); loadSocial(); }}
          onNeedSignIn={requireSignIn}
        />
      )}
    </div>
  );
}

function GalleryPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fce8f0] to-[#fde8dc] text-5xl font-black text-[var(--brand)]">
      {name[0]}
    </div>
  );
}

function PortfolioImage({ src, unoptimized, onError, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const srcValue = typeof src === "string" ? src : "";
  const resolvedSrc = failedSrc === srcValue ? IMAGE_FALLBACK_SRC : src;
  const shouldBypassOptimizer = unoptimized ?? (srcValue.includes("images.unsplash.com") && failedSrc !== srcValue);

  useEffect(() => {
    setFailedSrc(null);
  }, [srcValue]);

  return (
    <Image
      {...props}
      src={resolvedSrc}
      unoptimized={shouldBypassOptimizer}
      onError={(event) => {
        if (srcValue) setFailedSrc(srcValue);
        onError?.(event);
      }}
    />
  );
}

function LightboxPhoto({ src, alt }: { src: string; alt: string }) {
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    setFallback(false);
  }, [src]);

  return (
    // Plain img keeps fullscreen carousel navigation out of Next's image optimizer.
    <img
      src={fallback ? IMAGE_FALLBACK_SRC : src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-contain"
      draggable={false}
      onError={() => setFallback(true)}
    />
  );
}

function RateModal({
  providerProfileId, providerName, isAgent, businessName, initial, onClose, onSaved, onNeedSignIn
}: {
  providerProfileId: string; providerName: string; isAgent: boolean; businessName: string | null;
  initial: { stars: number; comment: string | null } | null;
  onClose: () => void; onSaved: () => void; onNeedSignIn: () => void;
}) {
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [alsoBusiness, setAlsoBusiness] = useState(true);
  const [sameForBusiness, setSameForBusiness] = useState(true);
  const [businessStars, setBusinessStars] = useState(initial?.stars ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (stars < 1) { setError("Pick a star rating"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/social/rate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerProfileId, stars, comment,
          alsoRateBusiness: isAgent && alsoBusiness,
          businessStars: isAgent && alsoBusiness ? (sameForBusiness ? stars : businessStars) : undefined
        })
      });
      if (res.status === 401) { onNeedSignIn(); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Could not save"); }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const StarPicker = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <Star className={`h-8 w-8 transition ${n <= value ? "fill-amber-400 text-amber-400" : "text-[var(--line)] hover:text-amber-300"}`} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Rate {providerName}</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]"><X className="h-5 w-5" /></button>
        </div>

        <StarPicker value={stars} onChange={setStars} />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Share your experience (optional)"
          className="mt-4 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />

        {isAgent && businessName && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={alsoBusiness} onChange={(e) => setAlsoBusiness(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
              Also apply this rating to {businessName}
            </label>
            {alsoBusiness && (
              <div className="mt-3 space-y-2 pl-6">
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <input type="checkbox" checked={sameForBusiness} onChange={(e) => setSameForBusiness(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--brand)]" />
                  Use the same rating for the business
                </label>
                {!sameForBusiness && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-[var(--muted)]">Rating for {businessName}</p>
                    <StarPicker value={businessStars} onChange={setBusinessStars} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
        <button onClick={submit} disabled={saving}
          className="mt-5 w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-black text-white hover:bg-[var(--brand-dark)] disabled:opacity-60">
          {saving ? "Saving…" : "Submit rating"}
        </button>
      </div>
    </div>
  );
}
