"use client";

import { useState } from "react";
import { Eye, EyeOff, Info, Loader2, MapPin, Phone, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SecuritySection } from "@/components/dashboard/security-section";

export function AccountSettings({
  userId,
  name: initialName,
  email,
  totpEnabled: initialTotp,
  phoneNumber: initialPhone,
  phoneWhatsApp: initialWhatsApp,
  addressLine1: initialAddr1,
  addressLine2: initialAddr2,
  city: initialCity,
  province: initialProvince,
  postalCode: initialPostal
}: {
  userId: string;
  name: string;
  email: string;
  totpEnabled: boolean;
  phoneNumber?: string | null;
  phoneWhatsApp?: boolean;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [phoneWhatsApp, setPhoneWhatsApp] = useState(initialWhatsApp ?? false);
  const [addr1, setAddr1] = useState(initialAddr1 ?? "");
  const [addr2, setAddr2] = useState(initialAddr2 ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [province, setProvince] = useState(initialProvince ?? "");
  const [postal, setPostal] = useState(initialPostal ?? "");
  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    setContactMsg("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone || null, phoneWhatsApp, addressLine1: addr1 || null, addressLine2: addr2 || null, city: city || null, province: province || null, postalCode: postal || null })
      });
      setContactMsg(res.ok ? "✓ Contact info saved" : "Could not save");
    } finally {
      setSavingContact(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      setProfileMsg(res.ok ? "✓ Profile updated" : "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg("New password must be at least 8 characters"); return; }
    setSavingPw(true);
    setPwMsg("");
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      const d = await res.json();
      if (res.ok) {
        setPwMsg("✓ Password changed");
        setCurrentPw("");
        setNewPw("");
      } else {
        setPwMsg(d.error ?? "Could not change password");
      }
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="font-black">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Email address
            </label>
            <input
              value={email}
              disabled
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--muted)] outline-none cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">Email cannot be changed here.</p>
          </div>
          {profileMsg && (
            <p className={cn("text-sm font-semibold", profileMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500")}>
              {profileMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--ink)]/90 disabled:opacity-60 transition"
          >
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </form>
      </section>

      {/* Contact info */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="font-black">Contact &amp; address</h2>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Your address is used for statistics purposes only and is <strong>never</strong> shown to providers. It is required when booking for a minor.</span>
        </div>

        <form onSubmit={saveContact} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 71 000 0000"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={phoneWhatsApp}
                onChange={(e) => setPhoneWhatsApp(e.target.checked)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-xs font-semibold text-[var(--muted)]">
                This number is WhatsApp enabled — receive booking confirmations &amp; QR codes via WhatsApp
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Address line 1</label>
            <input
              value={addr1}
              onChange={(e) => setAddr1(e.target.value)}
              placeholder="Street address"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Address line 2 (optional)</label>
            <input
              value={addr2}
              onChange={(e) => setAddr2(e.target.value)}
              placeholder="Apartment, suite, etc."
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cape Town"
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Province</label>
              <input
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Western Cape"
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Postal code</label>
            <input
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              placeholder="8001"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
            />
          </div>

          {contactMsg && (
            <p className={cn("text-sm font-semibold", contactMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500")}>
              {contactMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingContact}
            className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--ink)]/90 disabled:opacity-60 transition"
          >
            {savingContact && <Loader2 className="h-4 w-4 animate-spin" />}
            Save contact info
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="font-black">Change password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Current password
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="text-[var(--muted)]">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              New password
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="text-[var(--muted)]">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {pwMsg && (
            <p className={cn("text-sm font-semibold", pwMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500")}>
              {pwMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPw}
            className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--ink)]/90 disabled:opacity-60 transition"
          >
            {savingPw && <Loader2 className="h-4 w-4 animate-spin" />}
            Change password
          </button>
        </form>
      </section>

      {/* MFA + Passkeys */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="font-black">Two-factor &amp; Passkeys</h2>
        </div>
        <SecuritySection />
      </section>
    </div>
  );
}
