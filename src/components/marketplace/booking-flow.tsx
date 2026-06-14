"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, Star, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingCalendar } from "./booking-calendar";

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

type Step = "service" | "artist" | "date" | "time" | "datetime" | "auth" | "review" | "pay" | "done";

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
  const [conflict, setConflict] = useState<{ bookingId: string; service: string; startsAt: string; depositCents: number; depositForfeited: number; provider: { name: string; handle: string; avatarUrl: string | null; city: string | null } } | null>(null);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [payInfo, setPayInfo] = useState<{ bookingId: string; reference: string; publicKey: string; email: string; amountCents: number; subaccountCode?: string | null } | null>(null);
  const [payError, setPayError] = useState("");
  const payMountedRef = useRef(false);
  const popupRef = useRef<any>(null);

  // Working hours returned by availability API for the selected date (drives slot generation)
  const [workingHours, setWorkingHours] = useState<{ open: string; close: string } | null>(null);

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

  // Slots generated from actual working hours for the selected date
  const computedSlots = useMemo(() => {
    const open = workingHours?.open ?? "09:00";
    const close = workingHours?.close ?? "17:00";
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    const closeMins = ch * 60 + cm;
    const result = [];
    for (let m = oh * 60 + om; m < closeMins; m += 30) {
      if (totalDuration === 0 || m + totalDuration <= closeMins) {
        result.push({ h: Math.floor(m / 60), m: m % 60, label: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` });
      }
    }
    return result;
  }, [workingHours, totalDuration]);

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
    setConflict(null); setConflictDismissed(false);
    setSelectedAgent(undefined); setAssignedAgent(null);
    setAgents([]);
    const computedStart: Step = startStep ?? (
      preselectedServiceId && hasPreselectedDateTime ? "review" :
      preselectedServiceId ? "date" : "service"
    );
    setStep(computedStart);
    // Fetch session and provider schedule in parallel
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      const isAuthed = !!s?.user;
      setAuthed(isAuthed);
      if (computedStart === "review" && !isAuthed) setStep("auth");
    }).catch(() => setAuthed(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load all agents when the datetime step (or review step in calendar mode) becomes active
  useEffect(() => {
    const needsAgents = step === "datetime" || step === "artist" || (step === "review" && hasPreselectedDateTime && !!preselectedServiceId);
    if (!needsAgents || agentsLoading) return;
    if (agents.length > 0) return; // already loaded
    setAgentsLoading(true);
    loadAllAgents()
      .then((list) => setAgents(list))
      .finally(() => setAgentsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Also pre-fetch agents count on open so afterServiceStep knows whether to show artist step
  useEffect(() => {
    if (!open) return;
    fetch(`/api/providers/agents?providerProfileId=${providerProfileId}`)
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load busy slots and actual working hours for the selected date.
  // When a specific agent is chosen, fetch their schedule so slots reflect their availability.
  useEffect(() => {
    if (!date) return;
    setBusyLoading(true);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const pid = selectedAgent ? selectedAgent.id : providerProfileId;
    fetch(`/api/bookings/availability?providerProfileId=${pid}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => { setBusy(d.busy ?? []); setWorkingHours(d.workingHours ?? null); })
      .catch(() => { setBusy([]); setWorkingHours(null); })
      .finally(() => setBusyLoading(false));
  }, [date, providerProfileId, selectedAgent]);

  // Load all agents for the artist selection step (no slot filter — user picks before choosing date)
  async function loadAllAgents(): Promise<Agent[]> {
    try {
      const r = await fetch(`/api/providers/agents?providerProfileId=${providerProfileId}`);
      const d = await r.json();
      return d.agents ?? [];
    } catch { return []; }
  }

  // Load agents available for a specific slot — sorted by fewest bookings (round-robin allocation)
  // Also filters by serviceId so only agents who offer that service are shown
  async function loadAvailableAgents(ds: string, slotTime: string): Promise<Agent[]> {
    try {
      const svcParam = selectedIds[0] ? `&serviceId=${selectedIds[0]}` : "";
      const r = await fetch(`/api/providers/agents?providerProfileId=${providerProfileId}&date=${ds}&slot=${slotTime}&duration=${totalDuration || 60}${svcParam}`);
      const d = await r.json();
      return d.agents ?? [];
    } catch { return []; }
  }

  function afterServiceStep() {
    if (hasPreselectedDateTime) {
      setStep(authed === false ? "auth" : "review");
    } else {
      setStep("datetime");
    }
  }

  // Artist is selected (or "no preference") → move to date picker (legacy flow / startStep)
  function afterArtistStep(agent: Agent | null) {
    setSelectedAgent(agent);
    setAssignedAgent(null);
    setDate(null); setSlot(null);
    setStep("datetime");
  }

  // After time is selected: auto-assign least-loaded agent when "no preference",
  // validate chosen agent is still free, then proceed to review
  async function goAfterTime() {
    if (!date || !slot) return;
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (agents.length > 0) {
      setAgentsLoading(true);
      const available = await loadAvailableAgents(ds, slot);
      setAgentsLoading(false);

      if (selectedAgent) {
        // Verify chosen agent is still free at this slot
        const stillFree = available.some((a) => a.id === selectedAgent.id);
        if (!stillFree) {
          // Agent is booked — auto-assign least-loaded available one and note it
          setAssignedAgent(available[0] ?? null);
          setSelectedAgent(null);
        }
      } else {
        // "No preference": assign the least-loaded available agent (API returns sorted by fewest bookings)
        setAssignedAgent(available[0] ?? null);
      }
    }

    setStep(authed === false ? "auth" : "review");
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

  // Check for SELF booking conflicts whenever we land on review step
  useEffect(() => {
    if (step !== "review" || !date || !slot || !authed) return;
    setConflict(null);
    setConflictDismissed(false);
    setConflictLoading(true);
    const d = date;
    const [h, m] = slot.split(":").map(Number);
    const start = new Date(d); start.setHours(h, m, 0, 0);
    const params = new URLSearchParams({
      startsAt: start.toISOString(),
      duration: String(totalDuration || 60),
      excludeProviderId: providerProfileId
    });
    fetch(`/api/account/conflict-check?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.conflict) setConflict(d.conflict); })
      .catch(() => {})
      .finally(() => setConflictLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, date, slot]);

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
    ...(hasPreselectedDateTime ? [] : ["datetime" as Step]),
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
      <div className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88dvh] sm:max-w-[1080px] sm:rounded-3xl">
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
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-3 text-left transition ${sel ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : "border-[var(--line)] hover:border-[var(--ink)]"}`}>
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm">{s.name}</p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">{fmtDur(s.durationMinutes)}{s.performer ? ` · ${s.performer}` : ""} · <span className="font-black text-[var(--ink)]">{ZAR(s.priceCents)}</span></p>
                        </div>
                      </div>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${sel ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] text-[var(--muted)]"}`}>
                        {sel ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
            <aside className="lg:w-[340px] lg:shrink-0">
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
          <div className={step === "datetime" ? "w-full" : "w-full max-w-lg mx-auto"}>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>

                {/* ── Artist — shown before date, always when provider has a team ── */}
                {step === "artist" && (
                  <Section
                    title={`Choose your ${roleLabel(selectedCategories)}`}
                    onBack={preselectedServiceId ? undefined : () => setStep("service")}
                  >
                    {agentsLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" /></div>
                    ) : (
                      <>
                        <p className="mb-4 text-sm text-[var(--muted)]">
                          Pick a team member or leave it to us — we&apos;ll assign the best available artist when you choose your time.
                        </p>
                        <div className="space-y-2">
                          {/* No preference option */}
                          <button
                            onClick={() => afterArtistStep(null)}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition
                              ${selectedAgent === null
                                ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]"
                                : "border-[var(--line)] bg-white hover:border-[var(--brand)]"}`}
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--muted)]">
                              <UserCheck className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[var(--ink)]">No preference</p>
                              <p className="text-xs text-[var(--muted)]">Best available artist auto-assigned at your chosen time</p>
                            </div>
                            {selectedAgent === null && <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />}
                          </button>

                          {/* Individual agents */}
                          {agents.map((agent) => {
                            const isSel = selectedAgent?.id === agent.id;
                            return (
                              <button
                                key={agent.id}
                                onClick={() => afterArtistStep(agent)}
                                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition
                                  ${isSel
                                    ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]"
                                    : "border-[var(--line)] bg-white hover:border-[var(--brand)]"}`}
                              >
                                {agent.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={agent.avatarUrl} alt={agent.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                                ) : (
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">{agent.name[0]}</span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-[var(--ink)]">{agent.name}</p>
                                  {agent.serviceCategories.length > 0 && (
                                    <p className="text-xs text-[var(--muted)]">{agent.serviceCategories.join(", ")}</p>
                                  )}
                                </div>
                                {isSel && <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </Section>
                )}

                {/* ── Date + Time (combined) ── */}
                {(step === "datetime" || step === "date" || step === "time") && (
                  <div>
                    <button
                      onClick={() => preselectedServiceId ? undefined : setStep("service")}
                      className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]"
                      style={preselectedServiceId ? { visibility: "hidden" } : undefined}
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <h2 className="mb-4 text-xl font-black leading-tight">Pick a date &amp; time</h2>

                    {/* Agent selector row */}
                    {(agentsLoading && agents.length === 0) ? (
                      <div className="mb-4 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
                        <span className="text-xs text-[var(--muted)]">Loading artists…</span>
                      </div>
                    ) : agents.length > 0 && (
                      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {/* No preference chip */}
                        <button
                          onClick={() => { setSelectedAgent(null); setDate(null); setSlot(null); }}
                          className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition
                            ${selectedAgent === null
                              ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                              : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--ink)]"}`}
                        >
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          Any artist
                          {selectedAgent === null && <Check className="h-3 w-3" />}
                        </button>

                        {/* Individual agent chips */}
                        {agents.map((agent) => {
                          const isSel = selectedAgent?.id === agent.id;
                          return (
                            <button
                              key={agent.id}
                              onClick={() => { setSelectedAgent(agent); setDate(null); setSlot(null); }}
                              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition
                                ${isSel
                                  ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--ink)]"}`}
                            >
                              {agent.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={agent.avatarUrl} alt={agent.name} className="h-5 w-5 shrink-0 rounded-full object-cover" />
                              ) : (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white text-[10px] font-bold">
                                  {agent.name[0]}
                                </span>
                              )}
                              {agent.name}
                              {isSel && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Extras for preselected service — shown here since service step is skipped */}
                    {preselectedServiceId && allExtras.length > 0 && (
                      <div className="mb-4 space-y-1 rounded-2xl border border-[var(--line)] p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Optional extras</p>
                        {allExtras.map((e) => {
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

                    {/* Calendar + slots two-column grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-[460px_1fr]">
                      {/* Calendar — fixed width so cells stay square-ish */}
                      <div className="w-full min-w-0">
                        <BookingCalendar
                          providerProfileId={selectedAgent ? selectedAgent.id : providerProfileId}
                          serviceDuration={totalDuration}
                          selectedDate={date}
                          onSelectDate={(d) => { setDate(d); setSlot(null); }}
                          serviceId={selectedIds[0] ?? undefined}
                        />
                      </div>

                      {/* Time slots — fills remaining space */}
                      <div className="flex flex-col">
                        {!date ? (
                          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] py-12">
                            <p className="text-center text-sm text-[var(--muted)]">← Select a date first</p>
                          </div>
                        ) : busyLoading ? (
                          <div className="flex flex-1 items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
                          </div>
                        ) : (
                          <>
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              {date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
                            </p>
                            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[320px] pr-0.5">
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
                            <p className="mt-3 text-xs text-[var(--muted)]">Duration: {fmtDur(totalDuration)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Continue — only shown once slot selected */}
                    {date && slot && (
                      <button
                        onClick={goAfterTime}
                        disabled={agentsLoading}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50 transition"
                      >
                        {agentsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Continue <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* ── Auth ── */}
                {step === "auth" && (
                  <Section title="Sign in to confirm" onBack={() => setStep(hasPreselectedDateTime ? "service" : "datetime")}>
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
                  <Section title="Review & confirm" onBack={hasPreselectedDateTime && preselectedServiceId ? undefined : () => setStep(authed === false ? "auth" : "datetime")}>

                    {/* ── Calendar-booking mode: agent chips + extras at top ── */}
                    {hasPreselectedDateTime && preselectedServiceId && (
                      <>
                        {/* Agent chips */}
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Artist preference</p>
                          {agentsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading artists…
                            </div>
                          ) : agents.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                              <button
                                onClick={() => setSelectedAgent(null)}
                                className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedAgent === null ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--ink)]"}`}
                              >
                                <UserCheck className="h-3.5 w-3.5 shrink-0" /> Any artist
                                {selectedAgent === null && <Check className="h-3 w-3" />}
                              </button>
                              {agents.map((agent) => {
                                const isSel = selectedAgent?.id === agent.id;
                                return (
                                  <button key={agent.id} onClick={() => setSelectedAgent(agent)}
                                    className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${isSel ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--ink)]"}`}>
                                    {agent.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={agent.avatarUrl} alt={agent.name} className="h-5 w-5 shrink-0 rounded-full object-cover" />
                                    ) : (
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white text-[10px] font-bold">{agent.name[0]}</span>
                                    )}
                                    {agent.name}
                                    {isSel && <Check className="h-3 w-3" />}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--muted)]">Any available artist will be assigned.</p>
                          )}
                        </div>

                        {/* Extras */}
                        {allExtras.length > 0 && (
                          <div className="mb-4 space-y-1 rounded-2xl border border-[var(--line)] p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Optional extras</p>
                            {allExtras.map((e) => {
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
                      </>
                    )}

                    {/* ── Non-calendar mode: assigned agent banner ── */}
                    {!(hasPreselectedDateTime && preselectedServiceId) && displayAgent && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-3">
                        {displayAgent.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={displayAgent.avatarUrl} alt={displayAgent.name} className="h-10 w-10 rounded-xl object-cover shrink-0" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">{displayAgent.name[0]}</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Your artist</p>
                          <p className="font-black text-[var(--ink)]">{displayAgent.name}</p>
                          <p className="text-xs text-[var(--muted)]">at {providerName}</p>
                        </div>
                        {agents.length > 1 && (
                          <button onClick={() => setStep("datetime")} className="ml-auto shrink-0 rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition">
                            Change
                          </button>
                        )}
                      </div>
                    )}
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
                        {(["SELF", "CHILD", "OTHER"] as const).map((v) => {
                          const selfBlocked = v === "SELF" && !!conflict && !conflictDismissed;
                          return (
                          <button key={v} type="button"
                            onClick={() => !selfBlocked && setBookingFor(v)}
                            disabled={selfBlocked}
                            title={selfBlocked ? "You already have an appointment at this time" : undefined}
                            className={cn("rounded-xl border py-2 text-xs font-bold transition",
                              selfBlocked ? "border-[var(--line)] text-[var(--muted)]/40 cursor-not-allowed opacity-50" :
                              bookingFor === v ? "bg-[var(--ink)] border-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--ink)]")}>
                            {v === "SELF" ? "Myself" : v === "CHILD" ? "A child" : "Someone else"}
                          </button>
                        )})}
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

                    {/* Conflict warning banner */}
                    {conflictLoading && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking for conflicts…
                      </div>
                    )}
                    {conflict && bookingFor === "SELF" && !conflictDismissed && (
                      <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-amber-900">You already have an appointment at this time</p>
                            <div className="mt-2 flex items-center gap-2">
                              {conflict.provider.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={conflict.provider.avatarUrl} alt={conflict.provider.name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                              ) : (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900 text-xs font-bold">{conflict.provider.name[0]}</span>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-amber-900">{conflict.provider.name}</p>
                                <p className="text-xs text-amber-700">{conflict.service} · {new Date(conflict.startsAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</p>
                                {conflict.provider.city && <p className="text-xs text-amber-600">{conflict.provider.city}</p>}
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-amber-800">
                              If you proceed, your existing appointment will be <span className="font-bold">automatically cancelled</span>.
                              {conflict.depositForfeited > 0 ? ` Your ${ZAR(conflict.depositForfeited)} deposit will be forfeited.` : conflict.depositCents > 0 ? " Your deposit will be refunded (within cancellation window)." : ""}
                            </p>
                            <button
                              onClick={() => { setConflictDismissed(true); if (bookingFor === "SELF") {} }}
                              className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
                            >
                              Proceed anyway — cancel existing appointment
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <button onClick={confirm}
                      disabled={submitting || (bookingFor === "CHILD" && userHasAddress === false) || (bookingFor === "SELF" && !!conflict && !conflictDismissed)}
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
                    {displayAgent && displayAgent.id !== providerProfileId && (
                      <p className="mt-1 text-sm text-[var(--muted)]">Your artist: <span className="font-bold text-[var(--ink)]">{displayAgent.name}</span></p>
                    )}
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
