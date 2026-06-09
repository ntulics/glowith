"use client";

import { useState } from "react";
import { BookingFlow } from "./booking-flow";
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Service = { id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number };
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

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
const fmtDur = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn("h-3.5 w-3.5", s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200")}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-gray-700">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count} reviews)</span>
    </div>
  );
}

export function AgentProfilePage({ profile }: { profile: AgentProfile }) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "services" | "portfolio" | "reviews">("about");

  const memberYear = new Date(profile.memberSince).getFullYear();
  const yearsActive = new Date().getFullYear() - memberYear;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div className="h-32 bg-gradient-to-r from-[#D94472] to-[#E85D2F]" />

      <div className="max-w-3xl mx-auto px-4 pb-16 -mt-16">
        {/* Profile card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Avatar + name */}
          <div className="px-6 pb-5 pt-4">
            <div className="flex items-end gap-4 -mt-12">
              <div className="relative">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#D94472] text-3xl font-black text-white shadow-md">
                    {profile.name[0]?.toUpperCase()}
                  </div>
                )}
                {profile.verified && (
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </div>
              <div className="mb-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-gray-900">{profile.businessName}</h1>
                  {profile.verified && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#D94472]">{profile.category}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-lg font-black text-gray-900">{profile.appointmentsCompleted}</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fulfilled</p>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div className="text-center">
                <p className="text-lg font-black text-gray-900">{profile.followerCount}</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Followers</p>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div className="text-center">
                <p className="text-lg font-black text-gray-900">{profile.followingCount}</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Following</p>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <StarRating rating={profile.averageRating} count={profile.reviewCount} />
            </div>

            {/* Location + member since */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Member since {memberYear}{yearsActive > 0 ? ` · ${yearsActive}yr on Glowith` : ""}
              </span>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setBookingOpen(true)}
                className="flex-1 rounded-xl bg-[#D94472] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#c03360] transition"
              >
                Book appointment
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
                <Heart className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
                <MessageCircle className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Current employer */}
          <div className="border-t border-gray-100 px-6 py-4">
            <div className="flex items-start gap-3">
              {profile.parentBusinessAvatarUrl ? (
                <img src={profile.parentBusinessAvatarUrl} alt={profile.parentBusinessName} className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94472]/10 text-sm font-black text-[#D94472]">
                  {profile.parentBusinessName[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-gray-900">{profile.parentBusinessName}</p>
                  {profile.parentBusinessVerified && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {profile.employmentConfirmed ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Employer confirmed
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Awaiting confirmation
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{profile.currentRole ?? profile.category} · {profile.parentBusinessCity}</p>
              </div>
              <a
                href={`/provider/${profile.parentBusinessHandle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-[#D94472] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Visit salon
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          {(["about", "services", "portfolio", "reviews"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition",
                activeTab === t ? "bg-[#D94472] text-white" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* About */}
        {activeTab === "about" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-black text-gray-900">About</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
            </div>

            {profile.specializations && profile.specializations.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 font-black text-gray-900">Specializations</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((s) => (
                    <span key={s} className="rounded-full bg-[#D94472]/8 px-3 py-1 text-xs font-bold text-[#D94472]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#D94472]" />
                Current position
              </h2>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D94472]/10 text-sm font-black text-[#D94472]">
                  {profile.parentBusinessName[0]}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{profile.currentRole ?? profile.category}</p>
                  <p className="text-sm text-[#D94472] font-semibold">{profile.parentBusinessName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{profile.parentBusinessCity} · {memberYear} – Present</p>
                  {profile.employmentConfirmed && (
                    <p className="mt-1 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified by {profile.parentBusinessName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-black text-gray-900 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#D94472]" />
                Stats
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Appointments", value: profile.appointmentsCompleted, icon: CheckCircle2 },
                  { label: "Reviews", value: profile.reviewCount, icon: Star },
                  { label: "Followers", value: profile.followerCount, icon: Users },
                  { label: "Services", value: profile.services.length, icon: Clock }
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3">
                    <Icon className="h-4 w-4 text-[#D94472] mb-1" />
                    <p className="text-lg font-black text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === "services" && (
          <div className="mt-4 space-y-3">
            {profile.services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setBookingOpen(true)}
                className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left hover:border-[#D94472]/30 shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900">{svc.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{svc.category} · {fmtDur(svc.durationMinutes)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-[#D94472]">{ZAR(svc.priceCents)}</p>
                    <p className="text-xs text-gray-400">{ZAR(svc.depositCents)} deposit</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>
            ))}
            {profile.services.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-400">No services listed</p>
              </div>
            )}
          </div>
        )}

        {/* Portfolio */}
        {activeTab === "portfolio" && (
          <div className="mt-4">
            {profile.posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-400">No portfolio posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {profile.posts.map((post) => (
                  <div key={post.id} className="group relative overflow-hidden rounded-2xl aspect-square bg-gray-100">
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition p-3">
                      <p className="text-xs font-semibold text-white line-clamp-2">{post.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews placeholder */}
        {activeTab === "reviews" && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <StarRating rating={profile.averageRating} count={profile.reviewCount} />
            <p className="mt-3 text-sm text-gray-400">
              {profile.reviewCount === 0 ? "No reviews yet" : "Reviews are shown after a verified booking"}
            </p>
          </div>
        )}
      </div>

      {/* Booking flow */}
      {bookingOpen && (
        <BookingFlow
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          providerProfileId={profile.id}
          providerName={profile.businessName}
          services={profile.services}
        />
      )}
    </div>
  );
}
