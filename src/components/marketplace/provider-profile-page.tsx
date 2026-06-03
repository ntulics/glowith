"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Briefcase, CalendarDays, Clock3, Heart, MapPin, Share2, Star, UserCheck, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { BookingFlow } from "@/components/marketplace/booking-flow";

type Service = { id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number };
type Post = { id: string; caption: string; imageUrl: string; tags: string[]; likes: number; saves: number };

type Profile = {
  id: string; handle: string; businessName: string; name: string;
  category: string; bio: string; city: string; avatarUrl: string | null;
  verified: boolean; verifiedBy?: "GLOWITH" | "EMPLOYER" | null;
  mobile: boolean; studio: boolean; providerType: string;
  parentBusinessName?: string | null; parentBusinessCity?: string | null;
  memberSince: string; appointmentsCompleted: number;
  services: Service[]; posts: Post[];
};

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} hour ${m} mins` : `${h} hour${h > 1 ? "s" : ""}`;
};

type Tab = "services" | "portfolio" | "reviews" | "location";

export function ProviderProfilePage({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("services");
  const [showAllServices, setShowAllServices] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectService, setPreselectService] = useState<string | null>(null);
  const visibleServices = showAllServices ? profile.services : profile.services.slice(0, 4);

  function openBooking(serviceId?: string) {
    setPreselectService(serviceId ?? null);
    setBookingOpen(true);
  }

  const isAgent = !!profile.parentBusinessName;

  // ── Social state (follow + ratings) ──────────────────────────────
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

  function requireSignIn(): boolean {
    // booking flow handles its own auth; for follow/rate, bounce to login
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
      if (d.alsoFollowedCompany) {
        alert(`You're now following ${profile.parentBusinessName} too — agents are part of their company.`);
      }
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F5F3]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">← Back</Link>
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Share">
              <Share2 className="h-4 w-4 text-[var(--muted)]" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Save">
              <Heart className="h-4 w-4 text-[var(--muted)]" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:flex lg:gap-8">

        {/* ── Left sidebar ── */}
        <aside className="mb-6 lg:mb-0 lg:w-72 lg:shrink-0">
          <div className="sticky top-[5rem] rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            {/* Avatar */}
            <div className="relative mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-md">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} fill sizes="112px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fce8f0] to-[#fde8dc] text-3xl font-black text-[var(--brand)]">
                  {profile.businessName[0]}
                </div>
              )}
            </div>

            {/* Name & category */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-lg font-black">{profile.businessName}</h1>
                {profile.verified && (
                  <VerifiedBadge verifiedBy={profile.verifiedBy ?? "GLOWITH"} employerName={profile.parentBusinessName} />
                )}
              </div>
              <p className="text-sm text-[var(--muted)]">{profile.category}</p>

              {/* Rating */}
              <button onClick={() => setTab("reviews")} className="mt-2 flex w-full items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold">{ratingAvg != null ? ratingAvg.toFixed(1) : "—"}</span>
                <span className="text-xs text-[var(--muted)]">({ratingCount})</span>
              </button>

              {/* Location */}
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-[var(--muted)]">
                <MapPin className="h-3 w-3" />{profile.city}
              </p>
            </div>

            {/* Book now */}
            <button onClick={() => openBooking()} className="mt-5 w-full rounded-xl bg-[var(--ink)] py-3 text-sm font-bold text-white transition hover:bg-[var(--ink)]/90">
              Book now
            </button>

            {/* Follow */}
            <button onClick={toggleFollow} disabled={followBusy}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition disabled:opacity-60 ${following ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)] hover:border-[var(--brand)]"}`}>
              {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? "Following" : "Follow"}
              <span className="text-xs font-semibold text-[var(--muted)]">· {followers}</span>
            </button>

            {/* Stats */}
            <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Appointments completed</span>
                <span className="font-bold">{profile.appointmentsCompleted.toLocaleString()}</span>
              </div>
            </div>

            {/* Works at */}
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-[var(--muted)]">Works at</p>
              <div className="flex items-start gap-2">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                <div>
                  <p className="text-sm font-bold">{profile.parentBusinessName ?? profile.businessName}</p>
                  <p className="text-xs text-[var(--muted)]">{profile.parentBusinessCity ?? profile.city}</p>
                </div>
              </div>
            </div>

            {/* Type badges */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              {profile.mobile && (
                <span className="rounded-full bg-[#FFF0F4] px-2.5 py-1 text-xs font-semibold text-[var(--brand)]">Mobile</span>
              )}
              {profile.studio && (
                <span className="rounded-full bg-[#F0FFF4] px-2.5 py-1 text-xs font-semibold text-emerald-600">Studio</span>
              )}
              {profile.parentBusinessName ? (
                <span className="rounded-full bg-[#F0FFF4] px-2.5 py-1 text-xs font-semibold text-emerald-600">Agent</span>
              ) : profile.providerType === "FREELANCER" ? (
                <span className="rounded-full bg-[#FFF8E7] px-2.5 py-1 text-xs font-semibold text-amber-600">Freelancer</span>
              ) : null}
            </div>

            {/* Member since */}
            <p className="mt-4 border-t border-[var(--line)] pt-4 text-center text-xs text-[var(--muted)]">
              Member since {format(new Date(profile.memberSince), "MMMM yyyy")}
            </p>
          </div>
        </aside>

        {/* ── Right content ── */}
        <main className="min-w-0 flex-1">
          {/* Bio */}
          {profile.bio && (
            <p className="mb-6 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)] shadow-sm">
              {profile.bio}
            </p>
          )}

          {/* Tab nav */}
          <div className="mb-6 flex gap-2 overflow-x-auto">
            {(["services", "portfolio", "reviews", "location"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-bold capitalize transition",
                  tab === t
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]"
                )}
              >
                {t}
                {t === "services" && profile.services.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] text-white">
                    {profile.services.length > 99 ? "99+" : profile.services.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Services */}
          {tab === "services" && (
            <div className="space-y-3">
              {visibleServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-sm">
                  <div>
                    <p className="font-bold">{service.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <Clock3 className="h-3 w-3" />
                      {formatDuration(service.durationMinutes)}
                    </p>
                    <p className="mt-1 text-sm font-black">{formatZAR(service.priceCents)}</p>
                  </div>
                  <button onClick={() => openBooking(service.id)} className="shrink-0 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-bold transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    Book
                  </button>
                </div>
              ))}
              {profile.services.length > 4 && !showAllServices && (
                <button
                  onClick={() => setShowAllServices(true)}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white py-3 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  See all {profile.services.length} services
                </button>
              )}
              {profile.services.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">
                  No services listed yet
                </div>
              )}
            </div>
          )}

          {/* Portfolio */}
          {tab === "portfolio" && (
            <div>
              {profile.posts.length > 0 ? (
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
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center text-sm text-[var(--muted)]">
                  This professional doesn't have a portfolio yet
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          {tab === "reviews" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-black">{ratingAvg != null ? ratingAvg.toFixed(1) : "—"}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{ratingCount} rating{ratingCount !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => setRateOpen(true)}
                  className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">
                  {myRating ? "Edit your rating" : "Rate"}
                </button>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{r.name}</span>
                        <span className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.stars ? "fill-amber-400 text-amber-400" : "text-[var(--line)]"}`} />
                          ))}
                        </span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-[var(--muted)]">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">
                  No reviews yet — be the first to rate {profile.businessName}.
                </p>
              )}
            </div>
          )}

          {/* Location */}
          {tab === "location" && (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" />
                <div>
                  <p className="font-bold">{profile.businessName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{profile.city}</p>
                  {profile.mobile && (
                    <p className="mt-2 text-xs font-semibold text-[var(--brand)]">Also offers mobile / home visits</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#F9F5F3] p-3">
                <CalendarDays className="h-4 w-4 text-[var(--sage)]" />
                <p className="text-xs font-semibold text-[var(--muted)]">Book online to confirm your slot instantly</p>
              </div>
            </div>
          )}
        </main>
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
