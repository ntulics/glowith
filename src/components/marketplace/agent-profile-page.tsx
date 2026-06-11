"use client";

import { useState, useMemo } from "react";
import { BookingFlow } from "./booking-flow";
import { StickyBookingBar } from "./sticky-booking-bar";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";

type Service = { id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number; performer?: string | null };
type Post = { id: string; caption: string; imageUrl: string; images: string[]; tags: string[]; likes: number; saves: number; featured: boolean; serviceId?: string | null };

interface AgentProfile {
  id: string;
  userId: string;
  handle: string;
  businessName: string;
  name: string;
  category: string;
  bio: string;
  city: string;
  avatarUrl?: string | null;
  verified: boolean;
  verifiedBy?: string | null;
  memberSince: string;
  appointmentsCompleted: number;
  services: Service[];
  posts: Post[];
  parentBusinessName: string;
  parentBusinessHandle: string;
  parentBusinessCity: string;
  parentBusinessAvatarUrl?: string | null;
  parentBusinessVerified?: boolean;
  employmentConfirmed?: boolean;
  followerCount: number;
  followingCount: number;
  reviewCount: number;
  averageRating: number;
  currentRole?: string | null;
  specializations?: string[];
}

const ZAR = (c: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

const fmtDur = (m: number) =>
  m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

const formatDuration = fmtDur;

export function AgentProfilePage({ profile }: { profile: AgentProfile }) {
  const [bookTarget, setBookTarget] = useState<{ serviceId: string | null; date?: Date | null; slot?: string | null } | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceCat, setServiceCat] = useState("All");
  const [showAllServices, setShowAllServices] = useState(false);

  const memberYear = new Date(profile.memberSince).getFullYear();
  const yearsActive = new Date().getFullYear() - memberYear;

  const categories = useMemo(() => {
    const set = new Set(profile.services.map((s) => s.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [profile.services]);

  const filteredServices = useMemo(() => {
    const base = serviceCat === "All" ? profile.services : profile.services.filter((s) => s.category === serviceCat);
    return showAllServices ? base : base.slice(0, 5);
  }, [profile.services, serviceCat, showAllServices]);

  const totalFiltered = serviceCat === "All"
    ? profile.services.length
    : profile.services.filter((s) => s.category === serviceCat).length;

  function openBooking(serviceId?: string, date?: Date | null, slot?: string | null) {
    setBookTarget({ serviceId: serviceId ?? null, date, slot });
    setBookingOpen(true);
  }

  return (
    <div className="min-h-screen bg-[var(--background,#F9F5F3)]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--line,#E8E0DC)]/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-[90rem] items-center gap-3 px-4 sm:px-6">
          <a href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]">
            ←
          </a>
          <p className="min-w-0 shrink truncate text-base font-black">{profile.businessName}</p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Share">
              <Share2 className="h-4 w-4 text-[var(--muted)]" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)]" aria-label="Save">
              <Heart className="h-4 w-4 text-[var(--muted)]" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6">
        <div className="lg:flex lg:gap-8">

          {/* ── Left column ── */}
          <div className="min-w-0 flex-1 space-y-5">

            {/* Profile card */}
            <div className="rounded-2xl border border-[var(--line,#E8E0DC)] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="h-20 w-20 rounded-2xl object-cover shadow-sm sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--brand,#D94472)] text-3xl font-black text-white sm:h-24 sm:w-24">
                      {profile.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black text-[var(--ink)]">{profile.businessName}</h1>
                    {profile.verified && (
                      <VerifiedBadge
                        verifiedBy={(profile.verifiedBy as "GLOWITH" | "EMPLOYER") ?? "GLOWITH"}
                        employerName={profile.parentBusinessName}
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--brand,#D94472)]">
                    {profile.currentRole ?? profile.category}
                    {profile.parentBusinessName && ` · ${profile.parentBusinessName}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                    {profile.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{profile.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Member since {memberYear}{yearsActive > 0 ? ` · ${yearsActive}yr` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />{profile.followerCount} followers
                    </span>
                  </div>

                  {/* CTA row */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openBooking()}
                      className="rounded-xl bg-[var(--brand,#D94472)] px-5 py-2.5 text-sm font-black text-white hover:bg-[var(--brand-dark,#c03360)] transition"
                    >
                      Book appointment
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)] transition" aria-label="Message">
                      <MessageCircle className="h-4 w-4 text-[var(--muted)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="mt-5 flex flex-wrap gap-6 border-t border-[var(--line)] pt-4 text-center">
                {[
                  { value: profile.appointmentsCompleted, label: "Fulfilled" },
                  { value: profile.followerCount, label: "Followers" },
                  { value: profile.reviewCount, label: "Reviews" },
                  { value: profile.services.length, label: "Services" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-xl font-black text-[var(--ink)]">{value}</p>
                    <p className="text-xs text-[var(--muted)]">{label}</p>
                  </div>
                ))}
                {profile.reviewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-xl font-black text-[var(--ink)]">{profile.averageRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current employer */}
            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--ink)]">
                <Briefcase className="h-4 w-4 text-[var(--brand,#D94472)]" />
                Current employer
              </h2>
              <div className="flex items-start gap-3">
                {profile.parentBusinessAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.parentBusinessAvatarUrl} alt={profile.parentBusinessName} className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand,#D94472)]/10 text-sm font-black text-[var(--brand,#D94472)]">
                    {profile.parentBusinessName[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-[var(--ink)]">{profile.parentBusinessName}</p>
                    {profile.parentBusinessVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {profile.employmentConfirmed ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Confirmed</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Awaiting confirmation</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{profile.currentRole ?? profile.category} · {profile.parentBusinessCity}</p>
                </div>
                <a
                  href={`/provider/${profile.parentBusinessHandle.replace("@", "")}`}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--brand,#D94472)] hover:underline shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  View salon
                </a>
              </div>
            </div>

            {/* About */}
            {profile.bio && (
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-black text-[var(--ink)]">About</h2>
                <p className="text-sm leading-6 text-[var(--muted)]">{profile.bio}</p>
              </div>
            )}

            {/* Specializations */}
            {profile.specializations && profile.specializations.length > 0 && (
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--ink)]">
                  <Award className="h-4 w-4 text-[var(--brand,#D94472)]" />
                  Specializations
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((s) => (
                    <span key={s} className="rounded-full bg-[var(--brand,#D94472)]/8 px-3 py-1 text-xs font-bold text-[var(--brand,#D94472)]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Services ── */}
            <section id="services">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-black text-[var(--ink)]">Services</h2>
                <span className="text-sm text-[var(--muted)]">{profile.services.length} service{profile.services.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Category filter pills */}
              {categories.length > 1 && (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setServiceCat(c); setShowAllServices(false); setSelectedServiceId(null); }}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
                        serviceCat === c
                          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                          : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {filteredServices.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedServiceId(isSelected ? null : service.id)}
                      className={cn(
                        "w-full rounded-2xl border px-5 py-4 text-left shadow-sm transition",
                        isSelected
                          ? "border-[var(--brand,#D94472)] bg-[#FFF0F4]"
                          : "border-[var(--line)] bg-white hover:border-[var(--brand,#D94472)]/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[var(--ink)]">{service.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                            <Clock3 className="h-3 w-3" />
                            {formatDuration(service.durationMinutes)}
                          </p>
                          <p className="mt-1 text-sm font-black text-[var(--ink)]">{ZAR(service.priceCents)}</p>
                        </div>
                        <div className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                          isSelected ? "border-[var(--brand,#D94472)] bg-[var(--brand,#D94472)]" : "border-[var(--line)]"
                        )}>
                          {isSelected && <span className="block h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!showAllServices && totalFiltered > 5 && (
                  <button
                    onClick={() => setShowAllServices(true)}
                    className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--ink)] hover:border-[var(--brand,#D94472)]"
                  >
                    See all {totalFiltered} services
                  </button>
                )}

                {profile.services.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">
                    No services listed yet
                  </div>
                )}
              </div>
            </section>

            {/* Reviews summary */}
            <section id="reviews" className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xl font-black text-[var(--ink)]">Reviews</h2>
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                <span className="text-2xl font-black text-[var(--ink)]">
                  {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-[var(--muted)]">{profile.reviewCount} rating{profile.reviewCount !== 1 ? "s" : ""}</span>
              </div>
              {profile.reviewCount === 0 && (
                <p className="mt-3 text-sm text-[var(--muted)]">No reviews yet — be the first to rate {profile.businessName}.</p>
              )}
            </section>
          </div>

          {/* ── Right sidebar ── */}
          <aside className="mt-6 lg:mt-0 lg:w-80 lg:shrink-0">
            <div className="sticky top-[6rem] space-y-4">

              {/* Intro card */}
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-black text-[var(--ink)]">Intro</h3>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-center gap-2 text-[var(--muted)]">
                    <Briefcase className="h-4 w-4 shrink-0 text-[var(--brand,#D94472)]" />
                    {profile.currentRole ?? profile.category} at <span className="font-semibold text-[var(--ink)]">&nbsp;{profile.parentBusinessName}</span>
                  </li>
                  {profile.city && (
                    <li className="flex items-center gap-2 text-[var(--muted)]">
                      <MapPin className="h-4 w-4 shrink-0 text-[var(--brand,#D94472)]" />
                      {profile.city}
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-[var(--muted)]">
                    <Users className="h-4 w-4 shrink-0 text-[var(--brand,#D94472)]" />
                    Followed by <span className="font-semibold text-[var(--ink)]">&nbsp;{profile.followerCount} people</span>
                  </li>
                  {profile.verified && (
                    <li className="flex items-center gap-2 text-[var(--muted)]">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-emerald-700 font-semibold">
                        {profile.verifiedBy === "EMPLOYER"
                          ? `Verified by ${profile.parentBusinessName}`
                          : "Verified by Glowith"}
                      </span>
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-[var(--muted)]">
                    <Calendar className="h-4 w-4 shrink-0 text-[var(--brand,#D94472)]" />
                    Member since {memberYear}
                  </li>
                </ul>
              </div>

              {/* Dynamic booking card */}
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                {selectedServiceId ? (() => {
                  const svc = profile.services.find(s => s.id === selectedServiceId)!;
                  return (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Your selection</p>
                      <p className="mt-2 font-black text-[var(--ink)]">{svc.name}</p>
                      <p className="text-xs text-[var(--muted)]">{formatDuration(svc.durationMinutes)}</p>
                      <p className="mt-1 text-xl font-black text-[var(--ink)]">{ZAR(svc.priceCents)}</p>
                      {svc.depositCents > 0 && (
                        <p className="text-xs text-[var(--muted)]">{ZAR(svc.depositCents)} deposit to confirm</p>
                      )}
                      <button
                        onClick={() => openBooking(svc.id)}
                        className="mt-4 w-full rounded-xl bg-[var(--brand,#D94472)] py-3 text-sm font-black text-white hover:bg-[var(--brand-dark,#c03360)] transition"
                      >
                        Book {svc.name}
                      </button>
                      <button
                        onClick={() => setSelectedServiceId(null)}
                        className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition"
                      >
                        Change selection
                      </button>
                    </>
                  );
                })() : (
                  <>
                    <p className="font-black text-[var(--ink)]">{profile.businessName}</p>
                    {profile.reviewCount > 0 && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold">{profile.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-[var(--muted)]">({profile.reviewCount})</span>
                      </div>
                    )}
                    <button
                      onClick={() => openBooking()}
                      className="mt-4 w-full rounded-xl bg-[var(--ink)] py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90 transition"
                    >
                      Book now
                    </button>
                    <p className="mt-2 text-center text-xs text-[var(--muted)]">
                      Select a service above to get started
                    </p>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Booking flow */}
      {bookingOpen && (
        <BookingFlow
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          providerProfileId={profile.id}
          providerName={profile.businessName}
          services={profile.services}
          preselectedServiceId={bookTarget?.serviceId ?? undefined}
          preselectedDate={bookTarget?.date ?? null}
          preselectedSlot={bookTarget?.slot ?? null}
          startStep={bookTarget?.date && bookTarget?.slot ? "review" : undefined}
        />
      )}

      {/* ── Mobile sticky booking bar ── */}
      <StickyBookingBar
        service={selectedServiceId ? (profile.services.find(s => s.id === selectedServiceId) ?? null) : null}
        providerProfileId={profile.id}
        onBook={(serviceId, date, slot) => openBooking(serviceId, date, slot)}
        onClear={() => setSelectedServiceId(null)}
      />
    </div>
  );
}
