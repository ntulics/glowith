"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, Star, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────────── */
type ServiceExtra = { id: string; name: string; description?: string | null; priceCents: number; durationMinutes: number };
type Service = { id: string; name: string; category?: string; durationMinutes: number; priceCents: number; depositCents: number; depositIsPercent?: boolean; performer?: string | null; extras?: ServiceExtra[] };
type Busy = { start: string; durationMinutes: number };
type Agent = { id: string; name: string; avatarUrl: string | null; category: string; serviceCategories: string[] };

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
const fmtDur = (m: number) => m <= 0 ? "" : (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`);

function roleLabel(categories: string[]): string {
  const j = categories.join(" ").toLowerCase();
  if (/hair/.test(j)) return "Hair Stylist";
  if (/nail/.test(j)) return "Nail Technician";
  if (/makeup|beauty|make.up/.test(j)) return "Makeup Artist";
  if (/braid|loc|twist/.test(j)) return "Braiding Specialist";
  if (/lash/.test(j)) return "Lash Technician";
  if (/skin|facial|wax/.test(j)) return "Beauty Therapist";
  if (/massage|body/.test(j)) return "Massage Therapist";
  if (/barber|beard|shave/.test(j)) return "Barber";
  return "Artist";
}

/* ── SA Public Holidays (client-side) ──────────────────────────── */
function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
function isSAPublicHolidayClient(d: Date): boolean {
  const y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate(), dow = d.getDay();
  const easter = easterSunday(y);
  const gf = new Date(easter); gf.setDate(easter.getDate() - 2);
  const fm = new Date(easter); fm.setDate(easter.getDate() + 1);
  // Fixed holidays: if the holiday falls on Sunday the actual observed day is Monday
  // We check whether 'd' IS the holiday or the displaced Monday
  function isFixed(hmo: number, hda: number): boolean {
    if (mo === hmo && da === hda) return true; // it is the holiday
    // displaced Monday: today is Monday, yesterday was Sunday and was the holiday
    if (dow === 1 && mo === hmo) {
      const sun = da - 1;
      if (sun === hda) return true;
    }
    return false;
  }
  return (
    isFixed(1, 1)   || // New Year
    isFixed(3, 21)  || // Human Rights Day
    (mo === gf.getMonth() + 1 && da === gf.getDate()) || // Good Friday
    (mo === fm.getMonth() + 1 && da === fm.getDate()) || // Family Day
    isFixed(4, 27)  || // Freedom Day
    isFixed(5, 1)   || // Workers' Day
    isFixed(6, 16)  || // Youth Day
    isFixed(8, 9)   || // Women's Day
    isFixed(9, 24)  || // Heritage Day
    isFixed(12, 16) || // Reconciliation Day
    isFixed(12, 25) || // Christmas
    isFixed(12, 26)    // Day of Goodwill
  );
}

function nextDays(n: number) {
  const out: Date[] = [];
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  for (let i = 0; out.length < n; i++) {
    const x = new Date(todayStart); x.setDate(todayStart.getDate() + i); out.push(x);
  }
  return out;
}

type Step = "service" | "artist" | "date" | "time" | "auth" | "review" | "pay" | "done";

/* ── Component ──────────────────────────────────────────────────── */
export function BookingFlow({
  open, onClose,
  providerProfileId, providerName, services, preselectedServiceId,
  preselectedDate, preselectedSlot, preselectedExtraIds, startStep,
  providerRating, providerReviewCount, providerAvatarUrl,
  drawer = false,
  inline = false,
  onSuccess,
  userHasAddress
}: {
  open: boolean; onClose: () => void;
  providerProfileId: string; providerName: string;
  services: Service[]; preselectedServiceId?: string | null;
  preselectedDate?: Date | null;
  preselectedSlot?: string | null;
  preselectedExtraIds?: string[];
  startStep?: Step;
  providerRating?: number;
  providerReviewCount?: number;
  providerAvatarUrl?: string | null;
  drawer?: boolean;
  /** Render content inline (no modal overlay — embed in sidebar/panel) */
  inline?: boolean;
  /** Called when the booking reaches the "done" step */
  onSuccess?: () => void;
  userHasAddress?: boolean;
}) {
  const hasPreselectedDateTime = !!(preselectedDate && preselectedSlot);

  const [step, setStep] = useState<Step>("service");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<ServiceExtra[]>([]);
  const [serviceCat, setServiceCat] = useState("All");
  const [date, setDate] = useState<Date | null>(preselectedDate ?? null);
  const [slot, setSlot] = useState<string | null>(preselectedSlot ?? null);
  const [busy, setBusy] = useState<Busy[]>([]);
  const [notes, setNotes] = useState("");
  const [bookingFor, setBookingFor] = useState<"SELF" | "CHILD" | "OTHER">("SELF");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [authName, setAuthName] = useState(""); const [authEmail, setAuthEmail] = useState(""); const [authPassword, setAuthPassword] = useState("");
  const [busyLoading, setBusyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [payInfo, setPayInfo] = useState<{ bookingId: string; reference: string; publicKey: string; email: string; amountCents: number; subaccountCode?: string | null } | null>(null);
  const [payError, setPayError] = useState("");
  const payMountedRef = useRef(false);
  const popupRef = useRef<any>(null);

  // Working hours returned by availability API for the selected date
  const [workingHours, setWorkingHours] = useState<{ open: string; close: string } | null>(null);

  // Provider's weekly schedule (fetched once on open — enables synchronous day-closed checks)
  type WeeklySchedule = Record<number, { open: string; close: string } | null>;
  type ProviderSchedule = { weeklySchedule: WeeklySchedule; workOnPublicHolidays: boolean };
  const [schedule, setSchedule] = useState<ProviderSchedule | null>(null);

  // Per-day capacity data for the date picker (fill level only — closed state uses schedule)
  type DayMeta = { fill: number; hasSlot: boolean; closed: boolean };
  const [dayMeta, setDayMeta] = useState<Record<string, DayMeta>>({});

  // Artist selection
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null | undefined>(undefined); // undefined = not yet resolved
  const [assignedAgent, setAssignedAgent] = useState<Agent | null>(null); // randomly assigned

  const selectedServices = useMemo(() => services.filter((s) => selectedIds.includes(s.id)), [services, selectedIds]);
  const allExtras = useMemo(() => {
    const seen = new Set<string>();
    return selectedServices.flatMap((s) => (s.extras ?? []).filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }));
  }, [selectedServices]);
  const totalDuration = selectedServices.reduce((a, s) => a + s.durationMinutes, 0) + selectedExtras.reduce((a, e) => a + e.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((a, s) => a + s.priceCents, 0) + selectedExtras.reduce((a, e) => a + e.priceCents, 0);
  const finalTotal = Math.max(totalPrice - (appliedCode ? discountCents : 0), 0);
  // Match server logic: percentage deposits apply to the discounted total incl. extras
  const totalDeposit = selectedServices.reduce((a, s) => {
    if (s.depositIsPercent) return a + Math.round((finalTotal * (s.depositCents ?? 0)) / 100);
    return a + (s.depositCents ?? 0);
  }, 0);
  const depositDueAtCheckout = finalTotal === 0 ? 0 : Math.min(totalDeposit, finalTotal);
  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(set)];
  }, [services]);
  const catServices = serviceCat === "All" ? services : services.filter((s) => s.category === serviceCat);
  const selectedCategories = useMemo(() => [...new Set(selectedServices.map((s) => s.category).filter(Boolean) as string[])], [selectedServices]);

  // The provider actually used for booking
  const displayAgent = assignedAgent ?? (selectedAgent ?? null);
  const activeProviderId = displayAgent?.id ?? providerProfileId;
  const activeProviderName = displayAgent?.name ?? providerName;

  // Synchronously determine whether a day is closed (non-working day or public holiday)
  function isDayClosed(d: Date): boolean {
    if (!schedule) return false; // schedule still loading — optimistic
    const wh = schedule.weeklySchedule[d.getDay()];
    if (!wh) return true; // provider doesn't work this day of week
    if (!schedule.workOnPublicHolidays && isSAPublicHolidayClient(d)) return true;
    return false;
  }

  // Slots generated from actual working hours for the selected date (falls back to schedule then defaults)
  const computedSlots = useMemo(() => {
    let open = "09:00", close = "17:00";
    if (workingHours) {
      open = workingHours.open; close = workingHours.close;
    } else if (date && schedule) {
      const wh = schedule.weeklySchedule[date.getDay()];
      if (wh) { open = wh.open; close = wh.close; }
    }
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    const result = [];
    for (let m = oh * 60 + om; m < ch * 60 + cm; m += 30) {
      result.push({ h: Math.floor(m / 60), m: m % 60, label: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` });
    }
    return result;
  }, [workingHours, schedule, date]);

  function toggleService(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setSelectedExtras((prev) => {
      // Remove extras belonging to deselected service
      const svc = services.find((s) => s.id === id);
      if (!svc?.extras) return prev;
      const extraIds = new Set(svc.extras.map((e) => e.id));
      if (selectedIds.includes(id)) return prev.filter((e) => !extraIds.has(e.id));
      return prev;
    });
  }
  function toggleExtra(extra: ServiceExtra) {
    setSelectedExtras((prev) => prev.some((e) => e.id === extra.id) ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]);
  }

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setError("");
    setSelectedIds(preselectedServiceId ? [preselectedServiceId] : []);
    // Pre-populate extras when jumping straight to review
    if (preselectedExtraIds?.length && preselectedServiceId) {
      const svc = services.find((s) => s.id === preselectedServiceId);
      const pre = (svc?.extras ?? []).filter((e) => preselectedExtraIds.includes(e.id));
      setSelectedExtras(pre);
    } else {
      setSelectedExtras([]);
    }
    setDate(preselectedDate ?? null);
    setSlot(preselectedSlot ?? null);
    setNotes(""); setServiceCat("All");
    setSelectedAgent(undefined); setAssignedAgent(null);
    setAgents([]);
    setDayMeta({});
    setSchedule(null);
    if (startStep) {
      setStep(startStep);
    } else {
      setStep(preselectedServiceId ? "date" : "service");
    }
    // Fetch session and provider schedule in parallel
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      const isAuthed = !!s?.user;
      setAuthed(isAuthed);
      if (startStep === "review" && !isAuthed) setStep("auth");
    }).catch(() => setAuthed(false));
    fetch(`/api/providers/schedule?providerProfileId=${providerProfileId}`)
      .then((r) => r.json())
      .then((d) => setSchedule(d))
      .catch(() => {
        // On failure default to Mon–Fri 09–17, allow public holidays
        const ws: WeeklySchedule = {};
        for (let i = 0; i < 7; i++) ws[i] = null;
        for (let i = 1; i <= 5; i++) ws[i] = { open: "09:00", close: "17:00" };
        setSchedule({ weeklySchedule: ws, workOnPublicHolidays: true });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch agent count once per open (to know whether to show the artist step at all)
  useEffect(() => {
    if (!open || agents.length > 0 || agentsLoading) return;
    setAgentsLoading(true);
    fetch(`/api/providers/agents?providerProfileId=${providerProfileId}`)
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, [open, providerProfileId, agents.length, agentsLoading]);

  // Load busy slots and actual working hours for the selected date
  useEffect(() => {
    if (!date) return;
    setBusyLoading(true);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${providerProfileId}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => { setBusy(d.busy ?? []); setWorkingHours(d.workingHours ?? null); })
      .catch(() => { setBusy([]); setWorkingHours(null); })
      .finally(() => setBusyLoading(false));
  }, [date, providerProfileId]);

  // Prefetch capacity fill data for the next 14 days when the date step is shown.
  // Closed days (weekend / holiday) are already handled synchronously via isDayClosed,
  // so we skip those here to halve API calls on providers who work Mon–Fri.
  useEffect(() => {
    if (step !== "date" || totalDuration === 0) return;
    const days = nextDays(14);
    days.forEach((d) => {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dayMeta[ds]) return; // already fetched
      if (isDayClosed(d)) { // no need to fetch — we know it's closed
        setDayMeta((prev) => ({ ...prev, [ds]: { fill: 1, hasSlot: false, closed: true } }));
        return;
      }
      fetch(`/api/bookings/availability?providerProfileId=${providerProfileId}&date=${ds}`)
        .then((r) => r.json())
        .then((data) => {
          const wh: { open: string; close: string } | null = data.workingHours ?? null;
          const busySlots: Array<{ start: string; durationMinutes: number }> = data.busy ?? [];

          // Closed day: no working hours or full-day block
          const closed = !wh || busySlots.some((b) => b.durationMinutes >= 1440);
          if (closed) {
            setDayMeta((prev) => ({ ...prev, [ds]: { fill: 1, hasSlot: false, closed: true } }));
            return;
          }

          // Total capacity in minutes
          const [oh, om] = wh.open.split(":").map(Number);
          const [ch, cm] = wh.close.split(":").map(Number);
          const totalMins = (ch * 60 + cm) - (oh * 60 + om);
          if (totalMins <= 0) {
            setDayMeta((prev) => ({ ...prev, [ds]: { fill: 1, hasSlot: false, closed: true } }));
            return;
          }

          const bookedMins = busySlots.reduce((s, b) => s + b.durationMinutes, 0);
          const fill = Math.min(bookedMins / totalMins, 1);

          // Check if at least one slot of the required duration fits
          const now = new Date();
          const openMs = new Date(`${ds}T${wh.open}:00`).getTime();
          const closeMs = new Date(`${ds}T${wh.close}:00`).getTime();
          const STEP = 30 * 60000;
          let hasSlot = false;
          for (let t = openMs; t + totalDuration * 60000 <= closeMs; t += STEP) {
            if (t < now.getTime()) continue;
            const slotEnd = t + totalDuration * 60000;
            const overlaps = busySlots.some((b) => {
              const bs = new Date(b.start).getTime();
              const be = bs + b.durationMinutes * 60000;
              return t < be && slotEnd > bs;
            });
            if (!overlaps) { hasSlot = true; break; }
          }

          setDayMeta((prev) => ({ ...prev, [ds]: { fill, hasSlot, closed: false } }));
        })
        .catch(() => {
          // On error: don't mark day as available — let user try it and see
          setDayMeta((prev) => ({ ...prev, [ds]: { fill: 0, hasSlot: true, closed: false } }));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, providerProfileId, totalDuration]);

  // Fetch agents filtered by a specific slot so we only show available ones on the artist step
  async function loadAvailableAgents(ds: string, slotTime: string): Promise<Agent[]> {
    try {
      const r = await fetch(`/api/providers/agents?providerProfileId=${providerProfileId}&date=${ds}&slot=${slotTime}&duration=${totalDuration || 60}`);
      const d = await r.json();
      return d.agents ?? [];
    } catch { return []; }
  }

  function afterServiceStep() {
    if (hasPreselectedDateTime) {
      setStep(authed === false ? "auth" : "review");
    } else {
      setStep("date");
    }
  }

  async function afterArtistStep(agent: Agent | null) {
    setSelectedAgent(agent);
    if (agent === null) {
      // Pick random from the already-filtered available agents list
      const picked = agents.length > 0 ? agents[Math.floor(Math.random() * agents.length)] : null;
      setAssignedAgent(picked);
    } else {
      setAssignedAgent(null);
    }
    setStep(authed === false ? "auth" : "review");
  }

  // After time is selected: if there are agents, load filtered ones then go to artist step
  async function goAfterTime() {
    if (!date || !slot) return;
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setAgentsLoading(true);
    const available = await loadAvailableAgents(ds, slot);
    setAgentsLoading(false);
    if (available.length > 0) {
      // Overwrite agents with the filtered available set for the artist step
      setAgents(available);
      setSelectedAgent(undefined);
      setAssignedAgent(null);
      setStep("artist");
    } else {
      // No agents or no multi-agent setup — skip artist step
      setStep(authed === false ? "auth" : "review");
    }
  }

  async function onPaid() {
    if (!payInfo) return;
    await fetch("/api/payments/paystack/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: payInfo.reference })
    });
    setStep("done"); onSuccess?.();
  }

  function openCheckout() {
    const popup = popupRef.current;
    if (!popup || !payInfo) { setPayError("Payment is still loading — try again in a moment"); return; }
    const opts: any = {
      key: payInfo.publicKey, email: payInfo.email, amount: payInfo.amountCents,
      currency: "ZAR", reference: payInfo.reference, ref: payInfo.reference,
      subaccount: payInfo.subaccountCode ?? undefined, bearer: "account",
      onSuccess: onPaid, onLoad: () => {}, onCancel: () => {}, onClose: () => {}
    };
    try {
      if (typeof popup.newTransaction === "function") popup.newTransaction(opts);
      else if (typeof popup.checkout === "function") popup.checkout(opts);
      else setPayError("Could not open checkout");
    } catch { setPayError("Could not open checkout"); }
  }

  useEffect(() => {
    if (!open || step !== "pay" || !payInfo || payMountedRef.current) return;
    payMountedRef.current = true;
    function mount() {
      const Pop = (window as any).PaystackPop;
      if (!Pop) { setPayError("Could not load the payment widget"); return; }
      popupRef.current = new Pop();
      try {
        popupRef.current.paymentRequest?.({
          key: payInfo!.publicKey, email: payInfo!.email, amount: payInfo!.amountCents,
          currency: "ZAR", ref: payInfo!.reference, container: "paystack-apple-pay",
          subaccount: payInfo!.subaccountCode ?? undefined, bearer: "account",
          style: { theme: "light", applePay: { width: "100%", borderRadius: "10px", type: "pay", locale: "en" } },
          onSuccess: onPaid, onError: () => {}, onCancel: () => {}
        });
      } catch { /* Apple Pay unavailable */ }
    }
    if ((window as any).PaystackPop) { mount(); return; }
    const existing = document.getElementById("paystack-inline-js");
    if (existing) { existing.addEventListener("load", mount); return; }
    const s = document.createElement("script");
    s.id = "paystack-inline-js"; s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = mount; s.onerror = () => setPayError("Could not load Paystack");
    document.body.appendChild(s);
  }, [open, step, payInfo]);

  if (!open) return null;

  function slotDate(hhmm: string): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(date!); d.setHours(h, m, 0, 0); return d;
  }
  function slotDisabled(hhmm: string): boolean {
    if (!date || totalDuration === 0) return true;
    const start = slotDate(hhmm);
    if (start.getTime() < Date.now()) return true;
    const end = start.getTime() + totalDuration * 60000;
    // Use actual provider close time; fall back to 18:00 if working hours not loaded yet
    const closeStr = workingHours?.close ?? "18:00";
    const [closeH, closeM] = closeStr.split(":").map(Number);
    const closeMs = new Date(date).setHours(closeH, closeM, 0, 0);
    if (end > closeMs) return true;
    // Also check open time
    if (workingHours) {
      const [openH, openM] = workingHours.open.split(":").map(Number);
      const openMs = new Date(date).setHours(openH, openM, 0, 0);
      if (start.getTime() < openMs) return true;
    }
    return busy.some((b) => {
      const bs = new Date(b.start).getTime(); const be = bs + b.durationMinutes * 60000;
      return start.getTime() < be && end > bs;
    });
  }

  async function doAuth() {
    setError(""); setSubmitting(true);
    try {
      if (authMode === "register") {
        const r = await fetch("/api/auth/register-client", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Could not create account");
      }
      const res = await signIn("credentials", { email: authEmail, password: authPassword, redirect: false });
      if (res?.error) throw new Error("Invalid email or password");
      setAuthed(true);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm() {
    if (!selectedServices.length || !date || !slot) return;
    setError(""); setSubmitting(true);
    try {
      const startsAt = slotDate(slot).toISOString();
      const res = await fetch("/api/bookings/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerProfileId: activeProviderId,
          serviceIds: selectedIds,
          extraIds: selectedExtras.map((e) => e.id),
          startsAt, notes, couponCode: appliedCode,
          bookingFor,
          attendeeName: attendeeName || null,
          attendeePhone: attendeePhone || null
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not create booking");

      if (d.booking.depositCents > 0) {
        const prep = await fetch("/api/payments/paystack/prepare", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: d.booking.id })
        });
        const pd = await prep.json();
        if (!prep.ok) throw new Error(pd.error ?? "Payment could not be started");
        if (pd.simulated) { setStep("done"); onSuccess?.(); return; }
        const host = typeof window !== "undefined" ? window.location.host : "";
        if (host.endsWith("glowith.co.za")) {
          const ret = encodeURIComponent(window.location.href);
          window.location.href = `https://glowith.co.za/pay?ref=${encodeURIComponent(pd.reference)}&return=${ret}`;
          return;
        }
        payMountedRef.current = false;
        setPayInfo({ bookingId: d.booking.id, reference: pd.reference, publicKey: pd.publicKey, email: pd.email, amountCents: pd.amountCents, subaccountCode: pd.subaccountCode });
        setStep("pay");
        return;
      }
      setStep("done"); onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function releaseAndBack() {
    if (payInfo?.bookingId) await fetch(`/api/bookings/${payInfo.bookingId}`, { method: "DELETE" });
    payMountedRef.current = false;
    setPayInfo(null); setPayError(""); setStep("review");
  }

  async function applyCoupon() {
    if (!selectedServices.length || !couponInput.trim()) return;
    setApplyingCoupon(true); setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerProfileId: activeProviderId, code: couponInput.trim(), serviceIds: selectedIds })
      });
      const d = await res.json();
      if (!d.valid) { setCouponError(d.error ?? "Invalid code"); setAppliedCode(null); setDiscountCents(0); return; }
      setAppliedCode(d.code); setDiscountCents(d.discountCents); setCouponLabel(d.label);
    } finally {
      setApplyingCoupon(false);
    }
  }

  const stepsOrder: Step[] = [
    ...(preselectedServiceId ? [] : ["service" as Step]),
    ...(hasPreselectedDateTime ? [] : ["date" as Step, "time" as Step]),
    ...(agents.length > 1 ? ["artist" as Step] : []),
    ...(authed === false ? ["auth" as Step] : []),
    "review", "pay", "done"
  ];
  const progress = (stepsOrder.indexOf(step) + 1) / Math.max(stepsOrder.length, 1);

  // ── Provider card shared ──
  const ProviderCard = ({ showChange = false }: { showChange?: boolean }) => (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--background)] p-3">
      <div className="flex items-center gap-3">
        {(displayAgent?.avatarUrl ?? providerAvatarUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(displayAgent?.avatarUrl ?? providerAvatarUrl)!} alt={activeProviderName} className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">{activeProviderName[0]}</div>
        )}
        <div>
          <p className="text-sm font-black text-[var(--ink)]">{activeProviderName}</p>
          {displayAgent && <p className="text-xs text-[var(--muted)]">at {providerName}</p>}
          {!displayAgent && assignedAgent === null && selectedAgent === null && agents.length > 0 && (
            <p className="text-xs text-[var(--muted)]">Artist auto-assigned</p>
          )}
          {providerRating !== undefined && !displayAgent && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className={`h-3 w-3 ${n <= Math.round(providerRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
              ))}
              <span className="ml-1 text-xs text-[var(--muted)]">{providerRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
      {showChange && agents.length > 1 && (
        <button onClick={() => setStep("artist")}
          className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition">
          Change
        </button>
      )}
    </div>
  );

  // ── Wrapper ──────────────────────────────────────────────────────
  const drawerWrapper = (children: React.ReactNode) => inline ? (
    // Inline mode: no overlay, renders in place (e.g. desktop sidebar)
    <div className="flex flex-col">{children}</div>
  ) : drawer ? (
    <>
      <div className="fixed inset-0 z-[58] bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[59] flex w-full max-w-[520px] flex-col bg-white shadow-2xl overflow-hidden">
        {children}
      </div>
    </>
  ) : (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Mobile: bottom sheet — Desktop: centered dialog */}
      <div className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88dvh] sm:max-w-lg sm:rounded-3xl">
        {children}
      </div>
    </>
  );

  return drawerWrapper(
    <>
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-2.5">
        {step === "service" ? (
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]"><ArrowLeft className="h-4 w-4" /></button>
        ) : (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <motion.div className="h-full rounded-full bg-[var(--brand)]" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        )}
        <h2 className="truncate text-base font-black">{step === "service" ? "Select services" : providerName}</h2>
        <button onClick={onClose} aria-label="Close" className="ml-auto shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]"><X className="h-4 w-4" /></button>
      </div>

      {/* ── Service selection ── */}
      {step === "service" ? (
        <div className={`flex flex-1 flex-col overflow-y-auto gap-6 px-4 py-5 ${!drawer ? "sm:px-8 lg:flex-row mx-auto w-full max-w-6xl" : ""}`}>
          <div className="min-w-0 flex-1">
            {!drawer && <h3 className="mb-1 text-2xl font-black">{providerName}</h3>}
            {categories.length > 1 && (
              <div className={`${drawer ? "mb-3" : "mb-5 mt-3"} flex gap-2 overflow-x-auto`}>
                {categories.map((c) => (
                  <button key={c} onClick={() => setServiceCat(c)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold transition ${serviceCat === c ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]"}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {catServices.map((s) => {
                const sel = selectedIds.includes(s.id);
                const hasExtras = (s.extras?.length ?? 0) > 0;
                return (
                  <div key={s.id}>
                    <button onClick={() => toggleService(s.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition ${sel ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : "border-[var(--line)] hover:border-[var(--ink)]"}`}>
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{s.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{fmtDur(s.durationMinutes)}{s.performer ? ` · with ${s.performer}` : ""}</p>
                        <p className="mt-1 text-sm font-black">{ZAR(s.priceCents)}</p>
                      </div>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sel ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] text-[var(--muted)]"}`}>
                        {sel ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </button>
                    {/* Inline extras when service is selected */}
                    {sel && hasExtras && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-[var(--brand)]/30 pl-3">
                        <p className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider">Optional extras</p>
                        {s.extras!.map((e) => {
                          const checked = selectedExtras.some((x) => x.id === e.id);
                          return (
                            <button key={e.id} onClick={() => toggleExtra(e)}
                              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${checked ? "border-[var(--brand)]/50 bg-[var(--brand)]/5" : "border-[var(--line)] bg-white hover:border-[var(--brand)]/40"}`}>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--ink)]">{e.name}</p>
                                {e.description && <p className="text-xs text-[var(--muted)]">{e.description}</p>}
                                <p className="text-xs font-semibold text-[var(--muted)]">
                                  {e.priceCents > 0 ? `+${ZAR(e.priceCents)}` : "Free"}
                                  {e.durationMinutes > 0 ? ` · +${e.durationMinutes} min` : ""}
                                </p>
                              </div>
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${checked ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] text-[var(--muted)]"}`}>
                                {checked ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {catServices.length === 0 && <p className="py-8 text-center text-sm text-[var(--muted)]">No services in this category.</p>}
            </div>
          </div>

          {/* Summary sidebar (full-screen only) */}
          {!drawer && (
            <aside className="lg:w-80 lg:shrink-0">
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm lg:sticky lg:top-4">
                {/* Provider */}
                <div className="mb-4 border-b border-[var(--line)] pb-4">
                  <div className="flex items-center gap-3">
                    {providerAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={providerAvatarUrl} alt={providerName} className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">{providerName[0]}</div>
                    )}
                    <div>
                      <p className="font-black text-sm">{providerName}</p>
                      {providerRating !== undefined && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((n) => <Star key={n} className={`h-3 w-3 ${n <= Math.round(providerRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />)}
                          <span className="ml-1 text-xs text-[var(--muted)]">{providerRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {selectedServices.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No services selected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedServices.map((s) => (
                      <div key={s.id} className="flex items-start justify-between gap-2 text-sm">
                        <span><span className="block font-semibold">{s.name}</span><span className="text-xs text-[var(--muted)]">{fmtDur(s.durationMinutes)}</span></span>
                        <span className="font-bold">{ZAR(s.priceCents)}</span>
                      </div>
                    ))}
                    {selectedExtras.map((e) => (
                      <div key={e.id} className="flex items-start justify-between gap-2 text-sm text-[var(--brand)]">
                        <span className="font-semibold text-xs">+ {e.name}</span>
                        <span className="font-bold text-xs">{e.priceCents > 0 ? `+${ZAR(e.priceCents)}` : "Free"}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                  <span className="font-black">Total</span>
                  <span className="font-black">{ZAR(totalPrice)}</span>
                </div>
                <button onClick={afterServiceStep} disabled={!selectedServices.length}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-3.5 text-sm font-bold text-white hover:bg-[var(--ink)]/90 disabled:opacity-40 transition">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </aside>
          )}

          {/* Sticky bottom bar in drawer mode */}
          {drawer && (
            <div className="sticky bottom-0 border-t border-[var(--line)] bg-white px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">{selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""}</span>
                <span className="font-black">{ZAR(totalPrice)}</span>
              </div>
              <button onClick={afterServiceStep} disabled={!selectedServices.length}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90 disabled:opacity-40 transition">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Other steps ── */
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <div className="w-full max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>

                {/* ── Artist ── (shown after time selection, agents already filtered by slot) */}
                {step === "artist" && (
                  <Section title={`Available ${roleLabel(selectedCategories)}`} onBack={() => setStep("time")}>
                    <p className="mb-4 text-sm text-[var(--muted)]">
                      {agents.length === 0 ? "No team members found for this slot." : "These team members are available for your selected time."}
                    </p>
                    <div className="space-y-2">
                      <button onClick={() => afterArtistStep(null)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-left hover:border-[var(--ink)] transition">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--muted)]">
                          <UserCheck className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-bold text-[var(--ink)]">No preference</p>
                          <p className="text-xs text-[var(--muted)]">Best available artist auto-assigned</p>
                        </div>
                      </button>
                      {agents.map((agent) => (
                        <button key={agent.id} onClick={() => afterArtistStep(agent)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-left hover:border-[var(--ink)] transition">
                          {agent.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={agent.avatarUrl} alt={agent.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">{agent.name[0]}</span>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--ink)]">{agent.name}</p>
                            {agent.serviceCategories.length > 0 && <p className="text-xs text-[var(--muted)]">{agent.serviceCategories.join(", ")}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {/* ── Date ── */}
                {step === "date" && (
                  <Section title="Pick a day" onBack={preselectedServiceId ? undefined : () => setStep("service")}>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {nextDays(14).map((d) => {
                        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        const meta = dayMeta[ds];
                        // isDayClosed is synchronous — no race condition on weekends/holidays
                        const unavailable = isDayClosed(d) || (meta ? (!meta.hasSlot || meta.closed) : false);
                        const fill = meta?.fill ?? 0;
                        const sel = date && d.toDateString() === date.toDateString();

                        // Fill colour: green → amber → rose as capacity fills
                        const fillColor = fill < 0.5
                          ? `rgb(34,197,94,${0.4 + fill * 0.6})`   // green
                          : fill < 0.85
                          ? `rgb(251,191,36,${0.5 + fill * 0.5})`  // amber
                          : `rgb(239,68,68,${0.55 + fill * 0.45})`; // red

                        return (
                          <button
                            key={d.toISOString()}
                            disabled={unavailable}
                            onClick={() => { setDate(d); setSlot(null); setStep("time"); }}
                            className={`relative overflow-hidden rounded-2xl border p-3 text-center transition
                              ${unavailable
                                ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/20 opacity-50"
                                : sel
                                ? "border-[var(--brand)] bg-[var(--brand)]/5"
                                : "border-[var(--line)] bg-white hover:border-[var(--brand)]"
                              }`}
                          >
                            {/* Capacity fill — water-in-cup effect rising from bottom */}
                            {!unavailable && meta && fill > 0 && (
                              <span
                                className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl transition-all duration-700"
                                style={{ height: `${Math.round(fill * 100)}%`, background: fillColor, opacity: 0.18 }}
                              />
                            )}

                            <span className={`relative block text-[10px] font-bold uppercase ${unavailable ? "text-[var(--muted)]/60" : "text-[var(--muted)]"}`}>
                              {d.toLocaleDateString("en-ZA", { weekday: "short" })}
                            </span>

                            {/* Date number — strikethrough when unavailable */}
                            <span className={`relative block text-lg font-black ${unavailable ? "line-through text-[var(--muted)]/50" : ""}`}>
                              {d.getDate()}
                            </span>

                            <span className={`relative block text-[10px] ${unavailable ? "text-[var(--muted)]/50" : "text-[var(--muted)]"}`}>
                              {d.toLocaleDateString("en-ZA", { month: "short" })}
                            </span>

                            {/* Capacity dot indicator below the date */}
                            {!unavailable && meta && (
                              <span className="relative mt-1.5 block">
                                <span className="mx-auto block h-1 w-8 overflow-hidden rounded-full bg-[var(--line)]">
                                  <span
                                    className="block h-full rounded-full transition-all duration-700"
                                    style={{ width: `${Math.round(fill * 100)}%`, background: fillColor }}
                                  />
                                </span>
                              </span>
                            )}

                            {/* Loading shimmer while meta not yet fetched */}
                            {!meta && (
                              <span className="relative mt-1.5 block">
                                <span className="mx-auto block h-1 w-8 animate-pulse rounded-full bg-[var(--line)]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* ── Time ── */}
                {step === "time" && (
                  <Section title="Choose a time" onBack={() => setStep("date")}>
                    {busyLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" /></div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {computedSlots.map((s) => {
                          const disabled = slotDisabled(s.label);
                          const sel = slot === s.label;
                          return (
                            <button key={s.label} disabled={disabled} onClick={() => setSlot(s.label)}
                              className={`rounded-xl border py-2.5 text-sm font-bold transition ${sel ? "border-[var(--brand)] bg-[var(--brand)] text-white" : disabled ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/30 text-[var(--muted)]/40" : "border-[var(--line)] bg-white hover:border-[var(--brand)]"}`}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-3 text-center text-xs text-[var(--muted)]">Duration: {fmtDur(totalDuration)}</p>
                    <NextButton disabled={!slot || agentsLoading} onClick={goAfterTime} />
                  </Section>
                )}

                {/* ── Auth ── */}
                {step === "auth" && (
                  <Section title="Sign in to confirm" onBack={() => setStep(hasPreselectedDateTime ? "service" : (agents.length > 1 ? "artist" : "time"))}>
                    <div className="mb-3 flex gap-2">
                      <button onClick={() => setAuthMode("signin")} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${authMode === "signin" ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)]"}`}>Sign in</button>
                      <button onClick={() => setAuthMode("register")} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${authMode === "register" ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)]"}`}>Create account</button>
                    </div>
                    <div className="space-y-2.5">
                      {authMode === "register" && <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]" />}
                      <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]" />
                      <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]" />
                    </div>
                    <button onClick={doAuth} disabled={submitting || !authEmail || !authPassword || (authMode === "register" && !authName)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue
                    </button>
                  </Section>
                )}

                {/* ── Review ── */}
                {step === "review" && selectedServices.length > 0 && date && slot && (
                  <Section title="Review & confirm" onBack={() => setStep(authed === false ? "auth" : (hasPreselectedDateTime ? (agents.length > 1 ? "artist" : "service") : "time"))}>
                    {/* Compact summary */}
                    <div className="space-y-1.5 rounded-2xl border border-[var(--line)] bg-white p-3.5 text-sm">
                      {selectedServices.map((s) => (
                        <div key={s.id} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">{s.name}</p>
                            <p className="text-xs text-[var(--muted)]">{fmtDur(s.durationMinutes)}</p>
                          </div>
                          <span className="shrink-0 font-black">{ZAR(s.priceCents)}</span>
                        </div>
                      ))}
                      {selectedExtras.map((e) => <Row key={e.id} label={`+ ${e.name}`} value={e.priceCents > 0 ? `+${ZAR(e.priceCents)}` : "Free"} highlight />)}
                      <div className="border-t border-[var(--line)] pt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                          <span>{date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} at {slot}</span>
                          <span>{fmtDur(totalDuration)}</span>
                        </div>
                      </div>
                      {appliedCode && <Row label={`Coupon (${couponLabel})`} value={`– ${ZAR(discountCents)}`} highlight />}
                      <div className="border-t border-[var(--line)] pt-2 flex items-center justify-between font-black">
                        <span>Total</span><span>{ZAR(finalTotal)}</span>
                      </div>
                      {depositDueAtCheckout > 0 && <p className="text-xs text-[var(--brand)] font-semibold">{ZAR(depositDueAtCheckout)} deposit to confirm</p>}
                    </div>

                    {/* Coupon */}
                    <div className="mt-2">
                      {appliedCode ? (
                        <button onClick={() => { setAppliedCode(null); setDiscountCents(0); setCouponInput(""); }} className="text-xs font-bold text-[var(--brand)] hover:underline">Remove coupon</button>
                      ) : (
                        <div className="flex gap-2">
                          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code"
                            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[var(--brand)]" />
                          <button onClick={applyCoupon} disabled={applyingCoupon || !couponInput.trim()}
                            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold hover:border-[var(--brand)] disabled:opacity-50">{applyingCoupon ? "…" : "Apply"}</button>
                        </div>
                      )}
                      {couponError && <p className="mt-1 text-xs font-semibold text-red-500">{couponError}</p>}
                    </div>

                    {/* Booking for */}
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Booking for</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["SELF", "CHILD", "OTHER"] as const).map((v) => (
                          <button key={v} type="button" onClick={() => setBookingFor(v)}
                            className={cn("rounded-xl border py-2 text-xs font-bold transition",
                              bookingFor === v ? "bg-[var(--ink)] border-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--ink)]")}>
                            {v === "SELF" ? "Myself" : v === "CHILD" ? "A child" : "Someone else"}
                          </button>
                        ))}
                      </div>
                      {bookingFor === "CHILD" && userHasAddress === false && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold text-amber-800">Address required for minor bookings</p>
                          <a href="/account/settings" target="_blank" rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200 transition">
                            Add address in Settings →
                          </a>
                        </div>
                      )}
                      {(bookingFor === "CHILD" || bookingFor === "OTHER") && (
                        <div className="mt-2 space-y-2 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                          <input value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)}
                            placeholder={bookingFor === "CHILD" ? "Child's full name" : "Full name"}
                            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
                          <input value={attendeePhone} onChange={(e) => setAttendeePhone(e.target.value)}
                            placeholder={bookingFor === "OTHER" ? "Their phone number" : "Emergency contact (optional)"}
                            type="tel" className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
                        </div>
                      )}
                    </div>

                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the provider should know? (optional)"
                      className="mt-3 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]" />
                    <button onClick={confirm} disabled={submitting || (bookingFor === "CHILD" && userHasAddress === false)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {depositDueAtCheckout > 0 ? "Continue to payment" : "Confirm booking"}
                    </button>
                  </Section>
                )}

                {/* ── Pay ── */}
                {step === "pay" && payInfo && (
                  <Section title="Pay deposit" onBack={releaseAndBack}>
                    <ProviderCard />
                    <div className="mt-3 mb-4 space-y-2 rounded-2xl border border-[var(--line)] bg-white p-4">
                      {selectedServices.map((s) => <Row key={s.id} label={s.name} value={ZAR(s.priceCents)} />)}
                      {selectedExtras.map((e) => <Row key={e.id} label={`+ ${e.name}`} value={e.priceCents > 0 ? `+${ZAR(e.priceCents)}` : "Free"} highlight />)}
                      {date && slot && <Row label="When" value={`${date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} at ${slot}`} />}
                      <div className="border-t border-[var(--line)] pt-2"><Row label="Deposit due now" value={ZAR(payInfo.amountCents)} highlight /></div>
                    </div>
                    <p className="mb-3 text-xs text-[var(--muted)]">Your slot is confirmed once the deposit is paid.</p>
                    <div id="paystack-apple-pay" className="w-full [&>*]:!w-full empty:hidden" />
                    <button id="paystack-other-channels" type="button" onClick={openCheckout}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)]">
                      Pay {ZAR(payInfo.amountCents)} — card, EFT &amp; more
                    </button>
                    {payError && <p className="mt-3 text-center text-sm font-semibold text-red-500">{payError}</p>}
                  </Section>
                )}

                {/* ── Done ── */}
                {step === "done" && (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-black">Booking confirmed!</h2>
                    <p className="mt-2 text-[var(--muted)]">
                      {activeProviderName} has your appointment
                      {date && slot ? ` for ${date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} at ${slot}` : ""}.
                    </p>
                    <button onClick={onClose} className="mt-6 rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90">Done</button>
                  </div>
                )}

                {error && <p className="mt-4 text-center text-sm font-semibold text-red-500">{error}</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Shared UI ──────────────────────────────────────────────────── */
function Section({ title, children, onBack }: { title: string; children: React.ReactNode; onBack?: () => void }) {
  return (
    <div>
      {onBack && (
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      <h2 className="mb-4 text-xl font-black leading-tight">{title}</h2>
      {children}
    </div>
  );
}

function NextButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
      Continue <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function Row({ label, value, highlight, bold, sub }: { label: string; value: string; highlight?: boolean; bold?: boolean; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="text-sm text-[var(--muted)]">
        {label}
        {sub && <span className="block text-xs text-[var(--muted)]/70">{sub}</span>}
      </span>
      <span className={`text-sm font-bold ${highlight ? "text-[var(--brand)]" : bold ? "text-[var(--ink)]" : ""}`}>{value}</span>
    </div>
  );
}
