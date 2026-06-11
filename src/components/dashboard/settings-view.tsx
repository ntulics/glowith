"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2, Building2, CreditCard, Bell, CalendarDays, Puzzle,
  ChevronRight, ChevronDown, Clock, Globe, CheckCircle2, Zap, User,
  Plus, X, Mail, MessageSquare, Phone, Info, ExternalLink, Copy,
  CheckCheck, BookOpen, Inbox, Camera, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/dashboard/location-picker";
import { SecuritySection } from "@/components/dashboard/security-section";

type Profile = {
  id: string; businessName: string; handle: string;
  bio: string; city: string; category: string; mobile: boolean; studio: boolean;
  avatarUrl?: string | null;
  latitude?: number; longitude?: number;
};

/* ── How-to guide content ────────────────────────────────────────── */
type HowToStep = { title: string; body: string };
type HowTo = { steps: HowToStep[]; docsUrl?: string };

const HOW_TO: Record<string, HowTo> = {
  "paystack": {
    docsUrl: "https://paystack.com/docs",
    steps: [
      { title: "Create a Paystack account", body: "Sign up at paystack.com and complete identity verification for your business." },
      { title: "Get your API keys", body: "In your Paystack dashboard go to Settings → API Keys & Webhooks. Copy your Live Secret Key and Live Public Key." },
      { title: "Enter keys in Glowith", body: "Paste the Secret Key and Public Key into the fields below and click Enable." },
      { title: "Set webhook URL", body: "In Paystack dashboard, add your webhook URL: https://{your-slug}.glowith.co.za/api/webhooks/paystack" },
      { title: "Test a payment", body: "Create a test booking and complete a payment using a Paystack test card to verify the integration." }
    ]
  },
  "yoco": {
    docsUrl: "https://developer.yoco.com",
    steps: [
      { title: "Create a Yoco account", body: "Sign up at yoco.com — Yoco is designed for South African businesses and requires a SA bank account." },
      { title: "Get your API keys", body: "Navigate to Developer → API Keys in your Yoco dashboard. Copy the Live Secret Key and Live Public Key." },
      { title: "Enter keys in Glowith", body: "Paste both keys into the Yoco integration fields below and click Enable." },
      { title: "Configure webhook", body: "Add webhook endpoint in Yoco dashboard: https://{your-slug}.glowith.co.za/api/webhooks/yoco" },
      { title: "Test a payment", body: "Use Yoco's test mode with a test card number to verify that bookings are marked as paid correctly." }
    ]
  },
  "payfast": {
    docsUrl: "https://developers.payfast.co.za",
    steps: [
      { title: "Create a PayFast account", body: "Register at payfast.co.za — verify your email and complete merchant onboarding." },
      { title: "Get Merchant ID & Key", body: "In your PayFast dashboard go to Settings → Merchant Details. Copy your Merchant ID and Merchant Key." },
      { title: "Enter credentials in Glowith", body: "Paste the Merchant ID, Merchant Key, and your Passphrase into the fields below." },
      { title: "Set ITN URL", body: "In PayFast, add your Instant Transaction Notification URL: https://{your-slug}.glowith.co.za/api/webhooks/payfast" },
      { title: "Enable sandbox testing", body: "Use PayFast sandbox (sandbox.payfast.co.za) to test with test credentials before going live." }
    ]
  },
  "google-calendar": {
    docsUrl: "https://developers.google.com/calendar",
    steps: [
      { title: "Enable Google Calendar API", body: "Go to console.cloud.google.com → Create a project → Enable the Google Calendar API and Google Meet API." },
      { title: "Create OAuth credentials", body: "Under APIs & Services → Credentials, create an OAuth 2.0 Client ID. Set the redirect URI to https://glowith.co.za/api/integrations/google/callback." },
      { title: "Authorise in Glowith", body: "Click Enable below — you'll be redirected to Google to grant Glowith calendar access." },
      { title: "Select calendars", body: "After authorisation, choose which Google Calendar to sync bookings into." },
      { title: "Test sync", body: "Create a test booking — it should appear in your Google Calendar within 30 seconds." }
    ]
  },
  "outlook": {
    docsUrl: "https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview",
    steps: [
      { title: "Register an Azure AD app", body: "Go to portal.azure.com → Azure Active Directory → App registrations → New registration." },
      { title: "Configure permissions", body: "Add Calendars.ReadWrite and OnlineMeetings.ReadWrite delegated permissions under Microsoft Graph." },
      { title: "Add redirect URI", body: "Set redirect URI to https://glowith.co.za/api/integrations/outlook/callback." },
      { title: "Copy client credentials", body: "Copy the Application (client) ID and create a client secret under Certificates & secrets." },
      { title: "Authorise in Glowith", body: "Enter the Client ID and Secret below, then click Enable to complete OAuth flow." }
    ]
  },
  "zoom": {
    docsUrl: "https://developers.zoom.us",
    steps: [
      { title: "Create a Zoom app", body: "Go to marketplace.zoom.us → Develop → Build App. Choose Server-to-Server OAuth." },
      { title: "Get credentials", body: "Note your Account ID, Client ID, and Client Secret from the app credentials page." },
      { title: "Add scopes", body: "Under Scopes, add: meeting:write:admin and meeting:read:admin." },
      { title: "Enter credentials in Glowith", body: "Paste Account ID, Client ID, and Client Secret below and click Enable." },
      { title: "Test meeting creation", body: "Create a booking — a Zoom meeting link should be generated automatically and sent to the client." }
    ]
  },
  "google-analytics": {
    docsUrl: "https://analytics.google.com",
    steps: [
      { title: "Create a GA4 property", body: "In Google Analytics, go to Admin → Create Property. Choose GA4 and complete the setup wizard." },
      { title: "Get your Measurement ID", body: "In Admin → Data Streams → Web stream, copy the Measurement ID (format: G-XXXXXXXXXX)." },
      { title: "Enter ID in Glowith", body: "Paste the Measurement ID into the field below and click Enable." },
      { title: "Verify tracking", body: "Open your booking page in a browser, then check GA4 Realtime report to confirm events are firing." }
    ]
  },
  "meta-pixel": {
    docsUrl: "https://developers.facebook.com/docs/meta-pixel",
    steps: [
      { title: "Create a Meta Pixel", body: "Go to business.facebook.com → Events Manager → Connect Data Sources → Web → Meta Pixel." },
      { title: "Copy your Pixel ID", body: "After creating the pixel, copy the 15–16 digit Pixel ID shown on the overview screen." },
      { title: "Enter Pixel ID in Glowith", body: "Paste the Pixel ID below and click Enable. Glowith will inject the base pixel code on your booking page." },
      { title: "Set up events", body: "Standard events like ViewContent (service page) and Purchase (booking confirmed) are tracked automatically." },
      { title: "Test with Pixel Helper", body: "Install the Meta Pixel Helper Chrome extension and visit your booking page to verify events fire." }
    ]
  },
  "mailchimp": {
    docsUrl: "https://mailchimp.com/developer",
    steps: [
      { title: "Get your API key", body: "In Mailchimp go to Account → Extras → API keys → Create A Key." },
      { title: "Find your Audience ID", body: "Go to Audience → Manage Audience → Settings and copy the Audience ID." },
      { title: "Enter credentials in Glowith", body: "Paste your API Key and Audience ID below and click Enable." },
      { title: "Choose sync trigger", body: "Select when contacts are synced: on booking confirmation, on client signup, or both." },
      { title: "Test the sync", body: "Create a test booking — the client email should appear in your Mailchimp audience within a few minutes." }
    ]
  },
  "whatsapp": {
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    steps: [
      { title: "Set up Meta Business account", body: "Create or use an existing Meta Business account at business.facebook.com." },
      { title: "Create a WhatsApp Business app", body: "Go to developers.facebook.com → My Apps → Create App → Business. Add the WhatsApp product." },
      { title: "Get Phone Number ID & Token", body: "In the WhatsApp dashboard, note the Phone Number ID and generate a Permanent Access Token." },
      { title: "Set webhook", body: "Configure your webhook URL: https://{your-slug}.glowith.co.za/api/webhooks/whatsapp and set the verify token shown below." },
      { title: "Enter credentials in Glowith", body: "Paste Phone Number ID and Access Token below. Once enabled, inbound messages appear in your Inbox." }
    ]
  },
  "sms": {
    docsUrl: "https://africastalking.com/sms",
    steps: [
      { title: "Create an Africa's Talking account", body: "Sign up at africastalking.com — available across Africa. Alternatively use Vonage/Twilio." },
      { title: "Get API credentials", body: "In your AT dashboard go to Settings → API Key. Copy the API Key and your registered sender name." },
      { title: "Top up SMS credits", body: "Add airtime/SMS credits to your account. Pricing varies per country." },
      { title: "Enter credentials in Glowith", body: "Paste your Username, API Key, and Sender ID below and click Enable." },
      { title: "Test SMS delivery", body: "Send a test booking confirmation — you should receive an SMS to your registered number." }
    ]
  },
  "email-inbox": {
    docsUrl: "https://docs.glowith.co.za/integrations/email",
    steps: [
      { title: "Configure inbound routing", body: "Inbound email to bookings@{slug}.glowith.co.za is automatically routed to your Inbox — no setup required." },
      { title: "Set up SMTP for outbound", body: "To send from your own domain, configure an SMTP provider under Settings → Notifications." },
      { title: "Add team members", body: "Inbox conversations are visible to all team members with dashboard access." },
      { title: "Reply from inbox", body: "Replies sent from the Inbox use your configured SMTP/notification email as the sender." }
    ]
  },
  "webhooks": {
    docsUrl: "https://docs.glowith.co.za/integrations/webhooks",
    steps: [
      { title: "Add a webhook endpoint", body: "Enter the URL of your server/service that will receive event payloads from Glowith." },
      { title: "Choose events to subscribe to", body: "Select which events trigger a webhook: booking.created, booking.cancelled, payment.received, etc." },
      { title: "Verify the signature", body: "Glowith signs every request with HMAC-SHA256. Use the signing secret shown below to verify payloads." },
      { title: "Test delivery", body: "Use the 'Send test' button to fire a test payload and confirm your endpoint responds with HTTP 200." },
      { title: "Monitor deliveries", body: "Check the delivery log for status of each event dispatch and re-deliver failed requests." }
    ]
  },
  "api": {
    steps: [
      { title: "Upgrade to Pro", body: "API access is available on Pro and higher plans. Upgrade to get your API key." },
      { title: "Generate API key", body: "After upgrading, go to Settings → Integrations → API and generate a key." },
      { title: "Read the docs", body: "Full API reference is available at docs.glowith.co.za/api — supports booking CRUD, client management, and webhooks." }
    ]
  }
};

/* ── Integration definitions ─────────────────────────────────────── */
type Integration = {
  id: string; name: string; description: string; icon: string;
  category: string; status: "disabled" | "upgrade";
  hasSetup?: boolean; inboundOutbound?: boolean;
};

const integrations: Integration[] = [
  // Calendar
  { id: "google-calendar", name: "Google Calendar & Meet", description: "Sync bookings with Google Calendar and auto-create Meet links for online appointments.", icon: "🗓️", category: "Calendar", status: "disabled" },
  { id: "apple-calendar", name: "Apple Calendar", description: "Connect Apple Calendar to sync personal and professional events with your bookings.", icon: "📅", category: "Calendar", status: "disabled" },
  { id: "outlook", name: "Outlook & Microsoft Teams", description: "Sync with Outlook Calendar and auto-create Teams meeting links.", icon: "📧", category: "Calendar", status: "disabled" },
  // Meetings
  { id: "zoom", name: "Zoom", description: "Automatically create Zoom meetings for bookings and notify clients with the link.", icon: "📹", category: "Meetings", status: "disabled" },
  // Payments — ZA-first
  { id: "paystack", name: "Paystack", description: "Accept card and bank payments from clients across Africa via Paystack.", icon: "💳", category: "Payments", status: "disabled", hasSetup: true },
  { id: "yoco", name: "Yoco", description: "Accept South African card payments online with Yoco — built for local businesses.", icon: "🟡", category: "Payments", status: "disabled", hasSetup: true },
  { id: "payfast", name: "PayFast", description: "South Africa's leading payment gateway — cards, EFT, and SnapScan.", icon: "💰", category: "Payments", status: "disabled", hasSetup: true },
  // Inbox
  { id: "email-inbox", name: "Email Inbox", description: "Receive and reply to client emails directly in your Glowith inbox. Inbound and outbound.", icon: "📩", category: "Inbox", status: "disabled", inboundOutbound: true },
  { id: "whatsapp", name: "WhatsApp Business", description: "Two-way WhatsApp messaging — send booking notifications and receive client replies in your inbox.", icon: "💬", category: "Inbox", status: "disabled", hasSetup: true, inboundOutbound: true },
  { id: "sms", name: "SMS", description: "Send booking confirmations and reminders via SMS. Receive replies in your inbox (Africa's Talking / Vonage).", icon: "📱", category: "Inbox", status: "disabled", hasSetup: true, inboundOutbound: true },
  // Marketing
  { id: "google-analytics", name: "Google Analytics", description: "Track booking page visitors and conversion behaviour with GA4.", icon: "📊", category: "Marketing", status: "disabled" },
  { id: "meta-pixel", name: "Meta Pixel", description: "Track ad conversions and optimise Facebook/Instagram campaigns.", icon: "📣", category: "Marketing", status: "disabled" },
  { id: "mailchimp", name: "Mailchimp", description: "Sync your client list to Mailchimp for email marketing and automations.", icon: "📮", category: "Marketing", status: "disabled", hasSetup: true },
  // Auth
  { id: "google-login", name: "Google Social Login", description: "Allow clients to sign in quickly using their Google account.", icon: "🔵", category: "Auth", status: "disabled" },
  { id: "facebook-login", name: "Facebook Social Login", description: "Allow clients to sign in using their Facebook account.", icon: "🟦", category: "Auth", status: "disabled" },
  // Developer
  { id: "webhooks", name: "Webhooks", description: "Connect external services — receive real-time event payloads on booking, payment, and cancellation.", icon: "🔗", category: "Developer", status: "disabled", hasSetup: true },
  { id: "api", name: "API Access", description: "Full REST API access for custom integrations and workflow automation.", icon: "⚡", category: "Developer", status: "upgrade" }
];

/* ── Settings sections ───────────────────────────────────────────── */
const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "working-hours", label: "Working hours", icon: Clock, parent: "company" },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "security", label: "Security", icon: ShieldCheck }
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ══════════════════════════════════════════════════════════════════ */
export function SettingsView({
  profile: initial,
  providerType,
  parentBusinessName,
  parentBusinessHandle
}: {
  profile: Profile;
  providerType?: string;
  parentBusinessName?: string | null;
  parentBusinessHandle?: string | null;
}) {
  const searchParams = useSearchParams();
  // An agent belongs to a business — company-level settings are managed there.
  const isAgent = !!parentBusinessName;
  const parentSlug = (parentBusinessHandle ?? "").replace("@", "");
  const [activeSection, setActiveSection] = useState("profile");
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>({});
  const [expandedHowTo, setExpandedHowTo] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState(
    DAYS.map((day, i) => ({ day, enabled: i < 5, from: "09:00", to: "17:00" }))
  );
  const [currency, setCurrency] = useState("ZAR");
  const [paymentMethod, setPaymentMethod] = useState("on-site");
  const [intSearchQuery, setIntSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Notifications
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [smtpProvider, setSmtpProvider] = useState<"smtp2go" | "postmark" | "smtp">("smtp2go");
  const [smtpGuideOpen, setSmtpGuideOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  // Banking / Paystack split pay
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState<string | null>(null);
  const [bankingStatus, setBankingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bankingError, setBankingError] = useState<string | null>(null);
  const [existingSubaccount, setExistingSubaccount] = useState<string | null>(null);

  const slug = form.handle.replace("@", "");
  const primaryEmail = `bookings@${slug}.glowith.co.za`;

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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "profile");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not upload avatar.");
      setForm((f) => ({ ...f, avatarUrl: data.url }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("[settings] avatar upload failed", error);
      alert(error instanceof Error ? error.message : "Could not upload avatar.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  function toggleIntegration(id: string) {
    setIntegrationStates((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function addEmail() {
    const trimmed = newEmail.trim();
    if (trimmed && !additionalEmails.includes(trimmed)) {
      setAdditionalEmails((p) => [...p, trimmed]);
      setNewEmail("");
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  }

  const filteredIntegrations = integrations.filter(
    (i) => !intSearchQuery ||
      i.name.toLowerCase().includes(intSearchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(intSearchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(intSearchQuery.toLowerCase())
  );

  // Agents only manage their own Profile; everything else is company-level.
  const availableSections = isAgent ? sections.filter((s) => s.id === "profile") : sections;
  const navSections = availableSections.filter((s) => !s.parent);
  const subSections = availableSections.filter((s) => s.parent === "company");

  useEffect(() => {
    const requested = searchParams.get("section");
    if (requested && requested !== activeSection && availableSections.some((section) => section.id === requested)) {
      setActiveSection(requested);
    }
  }, [activeSection, availableSections, searchParams]);

  useEffect(() => {
    fetch("/api/dashboard/banking")
      .then((r) => r.json())
      .then((d) => {
        if (d.banks) setBanks(d.banks);
        if (d.banking) {
          setBankCode(d.banking.bankCode ?? "");
          setBankAccountNumber(d.banking.bankAccountNumber ?? "");
          setBankAccountName(d.banking.bankAccountName ?? null);
          setExistingSubaccount(d.banking.paystackSubaccountCode ?? null);
        }
      })
      .catch(() => {});
  }, []);

  async function saveBanking() {
    setBankingStatus("saving");
    setBankingError(null);
    try {
      const res = await fetch("/api/dashboard/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, accountNumber: bankAccountNumber, accountName: bankAccountName }),
      });
      const data = await res.json();
      if (!res.ok) { setBankingError(data.error ?? "Failed to save banking details"); setBankingStatus("error"); return; }
      setBankAccountName(data.accountName);
      setExistingSubaccount(data.subaccountCode);
      setBankingStatus("saved");
      setTimeout(() => setBankingStatus("idle"), 3000);
    } catch {
      setBankingError("Network error. Please try again.");
      setBankingStatus("error");
    }
  }

  function handleNavClick(id: string) {
    setActiveSection(id);
    setMobileNavOpen(false);
  }

  /* ── Section renderers ───────────────────────────────────────────── */
  function renderProfile() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        {isAgent && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800">You're an agent of {parentBusinessName}</p>
              <p className="mt-1 text-sm text-emerald-700">
                You manage your own profile here. Company-level settings — working hours, payments,
                bookings, notifications and integrations — are managed by the business owner.
              </p>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">{isAgent ? "Your profile" : "Studio profile"}</h2>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Profile photo</label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#D94472]/10 text-xl font-black text-[#D94472]">
                    {form.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {avatarUploading ? "Uploading" : "Change photo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
              </label>
            </div>
          </div>
          {isAgent && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Business</label>
              <input value={parentBusinessName ?? ""} readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-500 outline-none cursor-not-allowed" />
            </div>
          )}
          {[
            { key: "businessName", label: isAgent ? "Display name" : "Business name" },
            { key: "city", label: "City" },
            { key: "category", label: "Category" },
            { key: "bio", label: "Bio", multiline: true }
          ].map(({ key, label, multiline }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
              {multiline ? (
                <textarea value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white resize-none" />
              ) : (
                <input value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
              )}
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              {isAgent ? "Your public page" : providerType === "FREELANCER" ? "Your public page" : "Subdomain"}
            </label>
            {isAgent ? (
              <div className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-500">
                {parentSlug}.glowith.co.za/team/{slug}
              </div>
            ) : providerType === "FREELANCER" ? (
              <div className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-500">
                freelancer.glowith.co.za/{slug}
              </div>
            ) : (
              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <input value={slug} readOnly className="flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none text-gray-400 min-w-0" />
                <span className="flex items-center border-l border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400 whitespace-nowrap">.glowith.co.za</span>
              </div>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Service type</label>
            <div className="flex flex-wrap gap-3">
              {[{ key: "mobile", label: "Mobile (travel to client)" }, { key: "studio", label: "Studio / salon" }].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={(form as any)[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 rounded accent-[#D94472]" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          {!isAgent && (
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Pin your exact location</label>
              <LocationPicker
                lat={(form as any).latitude ?? 0}
                lng={(form as any).longitude ?? 0}
                onChange={(la, lo) => { setForm((f) => ({ ...f, latitude: la, longitude: lo })); setSaved(false); }}
              />
            </div>
          )}
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
          {[{ key: "businessName", label: "Company name" }, { key: "city", label: "Address / City" }].map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Website</label>
            <input type="url" placeholder="https://" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Phone number</label>
            <input type="tel" placeholder="+27 ..." className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" className="rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">Save changes</button>
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
                <ToggleButton on={wh.enabled} onToggle={() => setWorkingHours((prev) => prev.map((d, j) => j === i ? { ...d, enabled: !d.enabled } : d))} />
                <span className="text-sm font-semibold w-20">{wh.day}</span>
              </label>
              {wh.enabled ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="time" value={wh.from}
                    onChange={(e) => setWorkingHours((prev) => prev.map((d, j) => j === i ? { ...d, from: e.target.value } : d))}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#D94472]" />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="time" value={wh.to}
                    onChange={(e) => setWorkingHours((prev) => prev.map((d, j) => j === i ? { ...d, to: e.target.value } : d))}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#D94472]" />
                </div>
              ) : <span className="text-xs text-gray-400">Closed</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="button" className="rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">Save changes</button>
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
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
                <option value="ZAR">South African Rand (ZAR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="KES">Kenyan Shilling (KES)</option>
                <option value="NGN">Nigerian Naira (NGN)</option>
                <option value="GHS">Ghanaian Cedi (GHS)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Symbol position</label>
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Default payment method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
              <option value="on-site">On-site (pay at studio)</option>
              <option value="online">Online payment</option>
              <option value="deposit">Deposit only</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Connect payment gateways (Paystack, Yoco, PayFast) under{" "}
            <button type="button" onClick={() => setActiveSection("integrations")} className="font-semibold text-[#D94472] hover:underline">
              Integrations
            </button>.
          </p>
        </div>
        {/* ── Banking / Paystack split pay ── */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="font-black text-base">Banking details</h2>
            <p className="text-xs text-gray-500 mt-1">
              Your banking details are used to automatically receive your share of each deposit via Paystack split pay.
              The platform retains its percentage and the rest is routed directly to your account.
            </p>
          </div>
          {existingSubaccount && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Paystack subaccount active — <span className="font-mono text-xs">{existingSubaccount}</span></span>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Bank</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
              >
                <option value="">Select bank…</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Account number</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Account name</label>
              <input
                type="text"
                value={bankAccountName ?? ""}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Initials and Surname"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white"
              />
            </div>
            {bankingError && (
              <p className="text-sm text-red-600">{bankingError}</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveBanking}
              disabled={!bankCode || !bankAccountNumber || !bankAccountName || bankingStatus === "saving"}
              className="rounded-xl bg-[#D94472] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {bankingStatus === "saving" ? "Verifying & saving…" : bankingStatus === "saved" ? "Saved!" : "Save banking details"}
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" className="rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">Save changes</button>
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Default appointment status</label>
            <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
              <option>Approved</option>
              <option>Pending</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Default time slot step</label>
            <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
              <option>15 min</option>
              <option>30 min</option>
              <option>60 min</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Period available for booking in advance (days)</label>
            <input type="number" defaultValue={365} min={1} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
          </div>
          {["Allow booking above maximum capacity", "Allow booking below minimum capacity", "Use service duration for booking a time slot", "Include service buffer time in time slots", "Show booking slots in client's time zone"].map((label) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="button" className="rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">Save changes</button>
        </div>
      </div>
    );
  }

  function renderNotifications() {
    const smtpProviders = [
      { id: "smtp2go" as const, label: "SMTP2Go (API)", icon: "📤" },
      { id: "postmark" as const, label: "Postmark", icon: "📬" },
      { id: "smtp" as const, label: "Standard SMTP", icon: "🔧" }
    ];

    const smtpGuides: Record<string, HowTo> = {
      smtp2go: {
        docsUrl: "https://www.smtp2go.com/docs/api",
        steps: [
          { title: "Create an SMTP2Go account", body: "Sign up at smtp2go.com — free tier includes 1,000 emails/month. Verify your sender domain for best deliverability." },
          { title: "Add and verify your domain", body: "In SMTP2Go go to Settings → Sender Domains → Add Domain. Add the provided DNS TXT records to your domain registrar." },
          { title: "Get your API key", body: "Go to Settings → API Keys → Add API Key. Give it a name like 'Glowith' and copy the key." },
          { title: "Enter the API key below", body: "Paste the API key in the field below. Glowith will use the SMTP2Go API (not SMTP) for reliable, tracked delivery." },
          { title: "Set your sender name & email", body: "Configure the From Name (e.g. 'Lume Studio') and From Email (e.g. bookings@yourdomain.co.za) — must be a verified sender." }
        ]
      },
      postmark: {
        docsUrl: "https://postmarkapp.com/developer",
        steps: [
          { title: "Create a Postmark account", body: "Sign up at postmarkapp.com. Postmark specialises in transactional email with excellent deliverability." },
          { title: "Create a Server and Message Stream", body: "In Postmark create a Server, then a Transactional message stream. Note the Server API Token." },
          { title: "Verify your sender domain", body: "Under Sender Signatures → Add Domain, follow the DKIM and Return-Path DNS instructions." },
          { title: "Enter Server Token in Glowith", body: "Paste the Server API Token below. Glowith will use Postmark's API for all outbound booking emails." },
          { title: "Monitor delivery", body: "Check Postmark's activity log to see opens, clicks, and bounces for all booking emails." }
        ]
      },
      smtp: {
        steps: [
          { title: "Choose an SMTP provider", body: "Common options: Gmail (smtp.gmail.com:587), Outlook (smtp.office365.com:587), or any business email provider." },
          { title: "Enable SMTP access", body: "For Gmail: go to Google Account → Security → App Passwords and generate a password. For Outlook: enable SMTP AUTH in admin." },
          { title: "Enter SMTP credentials", body: "Fill in Host, Port, Username (your email), and Password/App Password below." },
          { title: "Choose encryption", body: "Use STARTTLS on port 587 or SSL/TLS on port 465. Avoid port 25 — it's blocked by most cloud providers." },
          { title: "Send a test email", body: "Click 'Send test email' after saving to confirm Glowith can connect to your SMTP server." }
        ]
      }
    };

    const activeGuide = smtpGuides[smtpProvider];

    return (
      <div className="space-y-6 max-w-xl">
        {/* Primary email */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-black text-base">Notification emails</h2>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Primary booking email</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="flex-1 text-sm font-mono text-gray-700 truncate">{primaryEmail}</span>
              <button type="button" onClick={() => copyText(primaryEmail)} className="shrink-0 text-gray-400 hover:text-gray-700">
                {copiedText === primaryEmail ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">All booking notifications are sent from and received at this address automatically.</p>
          </div>

          {/* Additional emails */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Additional notification emails</label>
            {additionalEmails.map((email) => (
              <div key={email} className="mb-2 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{email}</span>
                <button type="button" onClick={() => setAdditionalEmails((p) => p.filter((e) => e !== email))} className="text-gray-300 hover:text-red-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                type="email" placeholder="another@example.com"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white min-w-0" />
              <button type="button" onClick={addEmail}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          {/* Notification toggles */}
          <div className="space-y-2 pt-1">
            {["Send booking confirmation to client", "Send booking confirmation to provider", "Send reminder 24h before appointment", "Send cancellation notification", "Send ICS calendar file for approved bookings"].map((label) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-700">{label}</span>
                <Toggle defaultOn />
              </div>
            ))}
          </div>
        </div>

        {/* SMTP configuration */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-base">Mail service (SMTP)</h2>
            <button type="button" onClick={() => setSmtpGuideOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <BookOpen className="h-3.5 w-3.5" /> How to guide
            </button>
          </div>

          {/* Provider tabs */}
          <div className="flex flex-wrap gap-2">
            {smtpProviders.map((p) => (
              <button key={p.id} type="button" onClick={() => setSmtpProvider(p.id)}
                className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition border",
                  smtpProvider === p.id ? "border-[#D94472] bg-[#D94472]/5 text-[#D94472]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}>
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* How-to guide */}
          {smtpGuideOpen && (
            <HowToGuide guide={activeGuide} label={smtpProviders.find((p) => p.id === smtpProvider)!.label} />
          )}

          {/* SMTP2Go */}
          {smtpProvider === "smtp2go" && (
            <div className="space-y-3">
              <Field label="SMTP2Go API Key" type="password" placeholder="api-xxxxxxxxxxxxxxxx" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="From Name" placeholder="Lume Studio" />
                <Field label="From Email" type="email" placeholder="bookings@yourdomain.co.za" />
              </div>
            </div>
          )}

          {/* Postmark */}
          {smtpProvider === "postmark" && (
            <div className="space-y-3">
              <Field label="Server API Token" type="password" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="From Name" placeholder="Lume Studio" />
                <Field label="From Email" type="email" placeholder="bookings@yourdomain.co.za" />
              </div>
            </div>
          )}

          {/* Standard SMTP */}
          {smtpProvider === "smtp" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="SMTP Host" placeholder="smtp.gmail.com" />
                <Field label="Port" placeholder="587" />
              </div>
              <Field label="Username" type="email" placeholder="you@gmail.com" />
              <Field label="Password / App Password" type="password" placeholder="••••••••••••" />
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Encryption</label>
                <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white">
                  <option>STARTTLS (port 587)</option>
                  <option>SSL/TLS (port 465)</option>
                  <option>None</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From Name" placeholder="Lume Studio" />
                <Field label="From Email" type="email" placeholder="bookings@yourdomain.co.za" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">Save</button>
            <button type="button" className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Send test email</button>
          </div>
        </div>
      </div>
    );
  }

  function renderIntegrations() {
    const categories = [...new Set(filteredIntegrations.map((i) => i.category))];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={intSearchQuery} onChange={(e) => setIntSearchQuery(e.target.value)}
              placeholder="Search integrations…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#D94472]" />
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
                  const guide = HOW_TO[integration.id];
                  const isHowToOpen = expandedHowTo === integration.id;

                  return (
                    <div key={integration.id}
                      className={cn("flex flex-col rounded-2xl border bg-white shadow-sm transition",
                        enabled ? "border-emerald-200" : "border-gray-100"
                      )}>
                      <div className="p-4 flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0">{integration.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold leading-snug">{integration.name}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {isUpgrade && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Pro</span>}
                              {integration.inboundOutbound && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                  {enabled ? "Inbound + Outbound" : "In/Out"}
                                </span>
                              )}
                            </div>
                          </div>
                          {enabled && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{integration.description}</p>

                        {/* How-to expandable */}
                        {guide && (
                          <div>
                            <button type="button"
                              onClick={() => setExpandedHowTo(isHowToOpen ? null : integration.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-[#D94472] hover:underline">
                              <BookOpen className="h-3.5 w-3.5" />
                              How to set up
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isHowToOpen && "rotate-180")} />
                            </button>
                            {isHowToOpen && <HowToGuide guide={guide} label={integration.name} />}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="border-t border-gray-50 px-4 py-3 flex items-center gap-2">
                        {isUpgrade ? (
                          <button type="button" className="ml-auto rounded-lg border border-[#D94472] px-3 py-1.5 text-xs font-bold text-[#D94472] hover:bg-[#D94472]/5">
                            Upgrade
                          </button>
                        ) : (
                          <>
                            {integration.hasSetup && (
                              <button type="button" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
                                Set up
                              </button>
                            )}
                            <button type="button" onClick={() => toggleIntegration(integration.id)}
                              className={cn("ml-auto rounded-lg px-3 py-1.5 text-xs font-bold transition",
                                enabled ? "border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-[#1a1a1a] text-white hover:opacity-90"
                              )}>
                              {enabled ? "Disable" : "Enable"}
                            </button>
                          </>
                        )}
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

  function renderSecurity() {
    return <SecuritySection />;
  }

  const contentMap: Record<string, () => React.ReactElement> = {
    profile: renderProfile,
    company: renderCompany,
    "working-hours": renderWorkingHours,
    payments: renderPayments,
    bookings: renderBookings,
    notifications: renderNotifications,
    integrations: renderIntegrations,
    security: renderSecurity
  };

  const sectionAllowed = availableSections.some((s) => s.id === activeSection);
  const activeSection_ = contentMap[activeSection] && sectionAllowed ? activeSection : "profile";
  const activeLabel = sections.find((s) => s.id === activeSection_)?.label ?? "Settings";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile nav toggle */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:hidden absolute top-14 left-0 right-0 z-20">
        <button type="button" onClick={() => setMobileNavOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">
          <Zap className="h-4 w-4" /> {activeLabel}
          <ChevronRight className={cn("h-4 w-4 transition-transform", mobileNavOpen && "rotate-90")} />
        </button>
      </div>

      {mobileNavOpen && (
        <div className="absolute top-[calc(3.5rem+2.75rem)] left-0 right-0 z-20 bg-white border-b border-gray-100 shadow-lg md:hidden">
          <nav className="p-3 space-y-0.5">
            {navSections.map(({ id, label, icon: Icon }) => (
              <div key={id}>
                <button type="button" onClick={() => handleNavClick(id)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-left transition",
                    activeSection_ === id ? "bg-[#D94472]/8 text-[#D94472]" : "text-gray-600 hover:bg-gray-50"
                  )}>
                  <Icon className="h-4 w-4 shrink-0" /> {label}
                </button>
                {id === "company" && subSections.map((sub) => (
                  <button key={sub.id} type="button" onClick={() => handleNavClick(sub.id)}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold text-left transition",
                      activeSection_ === sub.id ? "bg-[#D94472]/8 text-[#D94472]" : "text-gray-500 hover:bg-gray-50"
                    )}>
                    {sub.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop left nav */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-gray-100 bg-white overflow-y-auto">
        <div className="border-b border-gray-100 px-4 py-4">
          <h1 className="text-lg font-black">Settings</h1>
        </div>
        <nav className="flex-1 px-3 py-3">
          <ul className="space-y-0.5">
            {navSections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button type="button" onClick={() => setActiveSection(id)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-left transition",
                    activeSection_ === id ? "bg-[#D94472]/8 text-[#D94472]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}>
                  <Icon className="h-4 w-4 shrink-0" /> {label}
                </button>
                {id === "company" && subSections.map((sub) => (
                  <button key={sub.id} type="button" onClick={() => setActiveSection(sub.id)}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg pl-9 pr-3 py-1.5 text-sm font-semibold text-left transition",
                      activeSection_ === sub.id ? "bg-[#D94472]/8 text-[#D94472]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}>
                    {sub.label}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="hidden md:flex border-b border-gray-100 bg-white px-6 py-4 items-center sticky top-0 z-10">
          <h2 className="text-xl font-black">{activeLabel}</h2>
        </div>
        {/* extra top padding on mobile to clear the absolute nav strip */}
        <div className="p-4 pt-16 md:pt-0 md:p-6">{contentMap[activeSection_]()}</div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────── */
function HowToGuide({ guide, label }: { guide: HowTo; label: string }) {
  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">How to set up {label}</p>
        {guide.docsUrl && (
          <a href={guide.docsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <ol className="space-y-2.5">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-bold text-gray-800">{step.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <input type={type} placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
    </div>
  );
}

function ToggleButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-[#D94472]" : "bg-gray-200")}>
      <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", on ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return <ToggleButton on={on} onToggle={() => setOn((v) => !v)} />;
}

function SaveBar({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved!</p>}
      <button type="submit" disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
      </button>
    </div>
  );
}
