"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock3, Heart, MapPin, Menu, Share2, Star, UserCheck, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { BookingFlow } from "@/components/marketplace/booking-flow";

type Service = { id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number };
type Post = { id: string; caption: string; imageUrl: string; tags: string[]; likes: number; saves: number };
type TeamMember = { id: string; name: string; role: string; avatarUrl: string | null; handle: string };

type Profile = {
  id: string; handle: string; businessName: string; name: string;
  category: string; bio: string; city: string; avatarUrl: string | null;
  verified: boolean; verifiedBy?: "GLOWITH" | "EMPLOYER" | null;
  mobile: boolean; studio: boolean; providerType: string;
  parentBusinessName?: string | null; parentBusinessCity?: string | null;
  memberSince: string; appointmentsCompleted: number;
  services: Service[]; posts: Post[]; team?: TeamMember[];
};

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} hour ${m} mins` : `${h} hour${h > 1 ? "s" : ""}`;
};

export function ProviderProfilePage({ profile }: { profile: Profile }) {
  const team = profile.team ?? [];
  const isAgent = !!profile.parentBusinessName;

  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectService, setPreselectService] = useState<string | null>(null);
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

  const galleryImages = profile.posts.map((p) => p.imageUrl);

  const sections = [
    profile.posts.length > 0 ? { id: "photos", label: "Photos" } : null,
    { id: "services", label: "Services" },
    team.length > 0 ? { id: "team", label: "Team" } : null,
    { id: "reviews", label: "Reviews" },
    { id: "about", label: "About" }
  ].filter(Boolean) as { id: string; label: string }[];

  function openBooking(serviceId?: string) {
    setPreselectService(serviceId ?? null);
    setBookingOpen(true);
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
  function requireSignIn(): boolean {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
    return true;
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Sticky top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-[90rem] items-center gap-3 px-4 sm:px-6">
          <button onClick={backToGlowith} aria-label="Back to Glowith" className="flex shrink-0 items-center gap-2 text-[var(--muted)] hover:text-[var(--ink)]">
            <ArrowLeft className="h-4 w-4" />
            <span role="img" aria-label="Glowith" className="logo-adaptive h-6" />
          </button>

          {/* Docked business section nav */}
          {docked && (
            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
              <span className="mr-2 shrink-0 truncate text-sm font-black">{profile.businessName}</span>
              {sections.map((s) => (
                <button key={s.id} onClick={() => scrollTo(s.id)}
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

      {/* Global menu drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-1 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span role="img" aria-label="Glowith" className="logo-adaptive h-6" />
              <button onClick={() => setMenuOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[var(--muted)]" /></button>
            </div>
            <Link href="/" className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--background)]">Discover</Link>
            <a href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--background)]">Log in</a>
            <a href="/signup" className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--background)]">List your business</a>
          </div>
        </>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ── Hero gallery (portfolio) ── */}
        <div className="grid gap-2 sm:grid-cols-3 sm:grid-rows-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#f3e8e4] sm:col-span-2 sm:row-span-2 sm:aspect-auto">
            {galleryImages[0] ? (
              <Image src={galleryImages[0]} alt={profile.businessName} fill sizes="(max-width:640px) 100vw, 66vw" className="object-cover" />
            ) : <GalleryPlaceholder name={profile.businessName} />}
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl bg-[#f3e8e4] sm:block">
              {galleryImages[i] ? (
                <Image src={galleryImages[i]} alt={`${profile.businessName} ${i}`} fill sizes="33vw" className="object-cover" />
              ) : <GalleryPlaceholder name={profile.businessName} />}
              {i === 2 && profile.posts.length > 0 && (
                <button onClick={() => scrollTo("photos")}
                  className="absolute bottom-3 right-3 rounded-full bg-white/95 px-4 py-2 text-xs font-bold shadow hover:bg-white">
                  See all photos
                </button>
              )}
            </div>
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
            <button key={s.id} onClick={() => scrollTo(s.id)}
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

            {/* Photos */}
            {profile.posts.length > 0 && (
              <section id="photos" className="scroll-mt-28">
                <h2 className="mb-4 text-xl font-black">Photos</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {profile.posts.map((post) => (
                    <div key={post.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
                      <div className="relative aspect-square bg-[#f3e8e4]">
                        <Image src={post.imageUrl} alt={post.caption} fill sizes="300px" className="object-cover" />
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-1 text-xs font-semibold">{post.caption}</p>
                        <p className="mt-1 text-[10px] text-[var(--muted)]">♥ {post.likes} · ⊕ {post.saves}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Services */}
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
                {shownServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-sm">
                    <div>
                      <p className="font-bold">{service.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]"><Clock3 className="h-3 w-3" />{formatDuration(service.durationMinutes)}</p>
                      <p className="mt-1 text-sm font-black">{formatZAR(service.priceCents)}</p>
                    </div>
                    <button onClick={() => openBooking(service.id)} className="shrink-0 rounded-xl border border-[var(--line)] px-5 py-2 text-sm font-bold transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                      Book
                    </button>
                  </div>
                ))}
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
                    <Link key={m.id} href={`/team/${m.handle}`} className="group text-center">
                      <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-[var(--line)] bg-gradient-to-br from-[#fce8f0] to-[#fde8dc]">
                        {m.avatarUrl ? (
                          <Image src={m.avatarUrl} alt={m.name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-2xl font-black text-[var(--brand)]">{m.name[0]}</span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-bold group-hover:text-[var(--brand)]">{m.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{m.role}</p>
                    </Link>
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
          </main>

          {/* ── Sticky book-now sidebar ── */}
          <aside className="mt-8 lg:mt-0 lg:w-80 lg:shrink-0">
            <div className="sticky top-[6rem] rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
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
            </div>
          </aside>
        </div>
      </div>

      <BookingFlow
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerProfileId={profile.id}
        providerName={profile.businessName}
        services={profile.services}
        preselectedServiceId={preselectService}
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
