"use client";

import { useState } from "react";
import {
  Loader2,
  Building2,
  CreditCard,
  Bell,
  CalendarDays,
  Puzzle,
  ChevronRight,
  Clock,
  Globe,
  CheckCircle2,
  ExternalLink,
  Zap,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  businessName: string;
  handle: string;
  bio: string;
  city: string;
  category: string;
  mobile: boolean;
  studio: boolean;
};

/* ── Integration definitions ─────────────────────────────────────── */
const integrations = [
  {
    id: "google-calendar",
    name: "Google Calendar & Meet",
    description: "Sync your bookings with Google Calendar and auto-create Meet links.",
    icon: "🗓️",
    category: "Calendar",
    status: "disabled" as const
  },
  {
    id: "apple-calendar",
    name: "Apple Calendar",
    description: "Connect Apple Calendar to sync personal and professional events.",
    icon: "📅",
    category: "Calendar",
    status: "disabled" as const
  },
  {
    id: "outlook",
    name: "Outlook & Microsoft Teams",
    description: "Sync with Outlook Calendar and create Teams meetings automatically.",
    icon: "📧",
    category: "Calendar",
    status: "disabled" as const
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Automatically create Zoom meetings for bookings and notify clients.",
    icon: "📹",
    category: "Meetings",
    status: "disabled" as const
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Send appointment notifications and reminders via WhatsApp.",
    icon: "💬",
    category: "Messaging",
    status: "disabled" as const
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Securely accept payments and deposits via Stripe.",
    icon: "💳",
    category: "Payments",
    status: "disabled" as const
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Accept payments for bookings and services via PayPal.",
    icon: "🅿️",
    category: "Payments",
    status: "disabled" as const
  },
  {
    id: "payfast",
    name: "PayFast",
    description: "Accept South African payments via PayFast.",
    icon: "💰",
    category: "Payments",
    status: "disabled" as const
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Track your booking page visitors and conversion behaviour.",
    icon: "📊",
    category: "Marketing",
    status: "disabled" as const
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel",
    description: "Add Meta Pixel to track ad conversions and optimise marketing.",
    icon: "📣",
    category: "Marketing",
    status: "disabled" as const
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Sync your client list to Mailchimp for email marketing campaigns.",
    icon: "📮",
    category: "Marketing",
    status: "disabled" as const
  },
  {
    id: "google-login",
    name: "Google Social Login",
    description: "Allow clients to sign in quickly using their Google account.",
    icon: "🔵",
    category: "Auth",
    status: "disabled" as const
  },
  {
    id: "facebook-login",
    name: "Facebook Social Login",
    description: "Allow clients to sign in using their Facebook account.",
    icon: "🟦",
    category: "Auth",
    status: "disabled" as const
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Connect web apps to automate messaging and send updates to custom URLs.",
    icon: "🔗",
    category: "Developer",
    status: "disabled" as const,
    hasSetup: true
  },
  {
    id: "api",
    name: "API Access",
    description: "Connect APIs effortlessly for smooth, integrated workflows.",
    icon: "⚡",
    category: "Developer",
    status: "upgrade" as const
  }
];

/* ── Settings sections ───────────────────────────────────────────── */
const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "working-hours", label: "Working hours", icon: Clock, parent: "company" },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Puzzle }
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SettingsView({ profile: initial }: { profile: Profile }) {
  const [activeSection, setActiveSection] = useState("profile");
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>({});
  const [workingHours, setWorkingHours] = useState(
    DAYS.map((day, i) => ({ day, enabled: i < 5, from: "09:00", to: "17:00" }))
  );
  const [currency, setCurrency] = useState("ZAR");
  const [paymentMethod, setPaymentMethod] = useState("on-site");
  const [intSearchQuery, setIntSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/dashboard/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleIntegration(id: string) {
    setIntegrationStates((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const filteredIntegrations = integrations.filter(
    (i) =>
      !intSearchQuery ||
      i.name.toLowerCase().includes(intSearchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(intSearchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(intSearchQuery.toLowerCase())
  );

  const navSections = sections.filter((s) => !s.parent);
  const subSections = sections.filter((s) => s.parent === "company");

  function handleNavClick(id: string) {
    setActiveSection(id);
    setMobileNavOpen(false);
  }

  /* ── Renders ─────────────────────────────────────────────────────── */
  function renderProfile() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">Studio profile</h2>

          {[
            { key: "businessName", label: "Business name" },
            { key: "city", label: "City" },
            { key: "category", label: "Category" },
            { key: "bio", label: "Bio", multiline: true }
          ].map(({ key, label, multiline }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {label}
              </label>
              {multiline ? (
                <textarea
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white resize-none"
                />
              ) : (
                <input
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
                />
              )}
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Subdomain
            </label>
            <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <input
                value={form.handle.replace("@", "")}
                readOnly
                className="flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none text-gray-400 min-w-0"
              />
              <span className="flex items-center border-l border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400 whitespace-nowrap">
                .glowith.co.za
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Service type
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "mobile", label: "Mobile (travel to client)" },
                { key: "studio", label: "Studio / salon" }
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(form as any)[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 rounded accent-[#D94472]"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <SaveBar loading={loading} saved={saved} />
      </form>
    );
  }

  function renderCompany() {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">Company details</h2>
          {[
            { key: "businessName", label: "Company name" },
            { key: "city", label: "Address / City" }
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {label}
              </label>
              <input
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Website
            </label>
            <input
              type="url"
              placeholder="https://"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Phone number
            </label>
            <input
              type="tel"
              placeholder="+27 ..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  function renderWorkingHours() {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-black text-base">Working hours</h2>
          <p className="text-sm text-gray-500">Set your studio's default working hours for each day of the week.</p>
          {workingHours.map((wh, i) => (
            <div key={wh.day} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3">
              <label className="flex items-center gap-2 min-w-[130px]">
                <button
                  type="button"
                  onClick={() =>
                    setWorkingHours((prev) => prev.map((d, j) => j === i ? { ...d, enabled: !d.enabled } : d))
                  }
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    wh.enabled ? "bg-[#D94472]" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      wh.enabled ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
                <span className="text-sm font-semibold w-20">{wh.day}</span>
              </label>
              {wh.enabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="time"
                    value={wh.from}
                    onChange={(e) =>
                      setWorkingHours((prev) => prev.map((d, j) => j === i ? { ...d, from: e.target.value } : d))
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#D94472]"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="time"
                    value={wh.to}
                    onChange={(e) =>
                      setWorkingHours((prev) => prev.map((d, j) => j === i ? { ...d, to: e.target.value } : d))
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#D94472]"
                  />
                </div>
              )}
              {!wh.enabled && <span className="text-xs text-gray-400">Closed</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  function renderPayments() {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
          <h2 className="font-black text-base">Currency</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
              >
                <option value="ZAR">South African Rand (ZAR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="KES">Kenyan Shilling (KES)</option>
                <option value="NGN">Nigerian Naira (NGN)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Symbol position
              </label>
              <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
                <option>Before</option>
                <option>After</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">Payment methods</h2>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Default payment method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
            >
              <option value="on-site">On-site (pay at studio)</option>
              <option value="online">Online payment</option>
              <option value="deposit">Deposit only</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Connect payment gateways under{" "}
            <button
              type="button"
              onClick={() => setActiveSection("integrations")}
              className="font-semibold text-[#D94472] hover:underline"
            >
              Integrations
            </button>{" "}
            to accept online payments.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  function renderBookings() {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
          <h2 className="font-black text-base">Appointment settings</h2>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Default appointment status
            </label>
            <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
              <option>Approved</option>
              <option>Pending</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Default time slot step
            </label>
            <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
              <option>15 min</option>
              <option>30 min</option>
              <option>60 min</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Period available for booking in advance (days)
            </label>
            <input
              type="number"
              defaultValue={365}
              min={1}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
            />
          </div>

          {[
            { label: "Allow booking above maximum capacity" },
            { label: "Allow booking below minimum capacity" },
            { label: "Use service duration for booking a time slot" },
            { label: "Include service buffer time in time slots" },
            { label: "Show booking slots in client's time zone" }
          ].map(({ label }) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">Email notifications</h2>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Notification email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
            />
          </div>
          {[
            "Send booking confirmation to client",
            "Send booking confirmation to provider",
            "Send reminder 24h before appointment",
            "Send cancellation notification",
            "Send ICS file for approved bookings"
          ].map((label) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle defaultOn />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">SMS / WhatsApp</h2>
          <p className="text-sm text-gray-500">
            Enable WhatsApp under{" "}
            <button
              type="button"
              onClick={() => setActiveSection("integrations")}
              className="font-semibold text-[#D94472] hover:underline"
            >
              Integrations
            </button>{" "}
            to send booking notifications via WhatsApp.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    );
  }

  function renderIntegrations() {
    const categories = [...new Set(filteredIntegrations.map((i) => i.category))];
    return (
      <div className="space-y-6">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={intSearchQuery}
              onChange={(e) => setIntSearchQuery(e.target.value)}
              placeholder="Search integrations…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#D94472]"
            />
          </div>
        </div>

        {categories.map((cat) => {
          const items = filteredIntegrations.filter((i) => i.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{cat}</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((integration) => {
                  const enabled = integrationStates[integration.id] ?? false;
                  const isUpgrade = integration.status === "upgrade";
                  return (
                    <div
                      key={integration.id}
                      className={cn(
                        "flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition",
                        enabled ? "border-emerald-200" : "border-gray-100"
                      )}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl shrink-0">{integration.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-snug">{integration.name}</p>
                          {isUpgrade && (
                            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 mt-0.5">
                              Pro
                            </span>
                          )}
                        </div>
                        {enabled && (
                          <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-4">
                        {integration.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700"
                        >
                          How to <ChevronRight className="h-3 w-3" />
                        </button>
                        <div className="ml-auto flex gap-2">
                          {isUpgrade ? (
                            <button
                              type="button"
                              className="rounded-lg border border-[#D94472] px-3 py-1.5 text-xs font-bold text-[#D94472] hover:bg-[#D94472]/5"
                            >
                              Upgrade
                            </button>
                          ) : (
                            <>
                              {integration.hasSetup && (
                                <button
                                  type="button"
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                >
                                  Set up
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleIntegration(integration.id)}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                                  enabled
                                    ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    : "bg-[#1a1a1a] text-white hover:opacity-90"
                                )}
                              >
                                {enabled ? "Disable" : "Enable"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const contentMap: Record<string, () => React.ReactElement> = {
    profile: renderProfile,
    company: renderCompany,
    "working-hours": renderWorkingHours,
    payments: renderPayments,
    bookings: renderBookings,
    notifications: renderNotifications,
    integrations: renderIntegrations
  };

  const activeSection_ = contentMap[activeSection] ? activeSection : "profile";
  const activeLabel = sections.find((s) => s.id === activeSection_)?.label ?? "Settings";

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left nav (desktop sidebar / mobile drawer) ── */}
      <>
        {/* Mobile nav toggle bar */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600"
          >
            <Zap className="h-4 w-4" />
            {activeLabel}
            <ChevronRight className={cn("h-4 w-4 transition-transform", mobileNavOpen && "rotate-90")} />
          </button>
        </div>

        {/* Mobile dropdown nav */}
        {mobileNavOpen && (
          <div className="absolute top-[calc(3.5rem+2.75rem)] left-0 right-0 z-20 bg-white border-b border-gray-100 shadow-lg md:hidden">
            <nav className="p-3 space-y-0.5">
              {navSections.map(({ id, label, icon: Icon }) => (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-left transition",
                      activeSection_ === id
                        ? "bg-[#D94472]/8 text-[#D94472]"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                  {id === "company" &&
                    subSections.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleNavClick(sub.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold text-left transition",
                          activeSection_ === sub.id
                            ? "bg-[#D94472]/8 text-[#D94472]"
                            : "text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                </div>
              ))}
            </nav>
          </div>
        )}
      </>

      {/* Desktop left nav */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-gray-100 bg-white overflow-y-auto">
        <div className="border-b border-gray-100 px-4 py-4">
          <h1 className="text-lg font-black">Settings</h1>
        </div>
        <nav className="flex-1 px-3 py-3">
          <ul className="space-y-0.5">
            {navSections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-left transition",
                    activeSection_ === id
                      ? "bg-[#D94472]/8 text-[#D94472]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
                {/* Company sub-items */}
                {id === "company" &&
                  subSections.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveSection(sub.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg pl-9 pr-3 py-1.5 text-sm font-semibold text-left transition",
                        activeSection_ === sub.id
                          ? "bg-[#D94472]/8 text-[#D94472]"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Desktop title bar */}
        <div className="hidden md:flex border-b border-gray-100 bg-white px-6 py-4 items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-black">{activeLabel}</h2>
        </div>

        <div className="p-4 md:p-6">{contentMap[activeSection_]()}</div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-[#D94472]" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function SaveBar({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Saved!
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </button>
    </div>
  );
}
