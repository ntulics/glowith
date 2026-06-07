"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SecuritySection } from "@/components/dashboard/security-section";

export function AccountSettings({
  userId,
  name: initialName,
  email,
  totpEnabled: initialTotp
}: {
  userId: string;
  name: string;
  email: string;
  totpEnabled: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

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
