"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { BadgeCheck, BookOpen, Briefcase, Building2, Copy, Link2, Mail, Plus, Scissors, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Agent = {
  id: string; name: string; email: string; handle: string;
  category: string; bio: string; city: string; verified: boolean;
  avatarUrl: string | null; serviceCount: number; bookingCount: number;
  postCount: number; joinedAt: string;
};

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]">
      {copied ? "Copied!" : <><Copy className="h-3 w-3" />{label}</>}
    </button>
  );
}

export function AgentsView({ businessName, businessHandle, providerType, businessId, agents: initial }: {
  businessName: string; businessHandle: string; providerType: string; businessId: string; agents: Agent[];
}) {
  const businessSlug = businessHandle.replace("@", "");
  const [agents, setAgents] = useState(initial);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ status: string; name?: string; inviteUrl?: string } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const isBusiness = providerType === "BUSINESS";

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    setInviteResult(null);
    try {
      const res = await fetch("/api/dashboard/agents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setInviteResult(data);
      if (data.status === "added") {
        // Refresh agents list
        const fresh = await fetch("/api/dashboard/agents");
        const fd = await fresh.json();
        if (fd.agents) setAgents(fd.agents.map((a: any) => ({
          id: a.id, name: a.user.name, email: a.user.email, handle: a.handle,
          category: a.category, bio: a.bio, city: a.city, verified: a.verified,
          avatarUrl: a.avatarUrl, serviceCount: a._count.services,
          bookingCount: a._count.bookings, postCount: a._count.posts,
          joinedAt: a.createdAt
        })));
      }
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Error");
    } finally {
      setInviting(false);
    }
  }

  async function removeAgent(id: string) {
    setRemoving(id);
    await fetch(`/api/dashboard/agents/${id}`, { method: "DELETE" });
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setRemoveConfirm(null);
    setRemoving(null);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--line)] bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black">Agents</h1>
            <p className="text-xs text-[var(--muted)]">{businessName} · {agents.length} agent{agents.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">

        {/* Freelancer info banner */}
        {!isBusiness && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Scissors className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800">You're registered as a Freelancer</p>
              <p className="mt-1 text-sm text-amber-700">
                Freelancers work independently and can be invited to join a business. If you manage a team,
                upgrade your account to a Business in Settings to start managing agents.
              </p>
            </div>
          </div>
        )}

        {/* Invite panel — business only */}
        {isBusiness && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[var(--brand)]" />
              <h2 className="font-black">Invite an agent</h2>
            </div>
            <form onSubmit={invite} className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="agent@example.com"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white"
                />
              </div>
              <button type="submit" disabled={inviting}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60">
                {inviting ? "Sending…" : "Invite"}
              </button>
            </form>
            <p className="mt-2 text-xs text-[var(--muted)]">
              If the person has a Glowith account they'll be added immediately. If not, you'll get a link to share.
            </p>
            {inviteError && <p className="mt-2 text-xs font-semibold text-red-500">{inviteError}</p>}
            {inviteResult?.status === "added" && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> {inviteResult.name} has been added to your team!
              </div>
            )}
            {inviteResult?.status === "invite_link" && inviteResult.inviteUrl && (
              <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                <p className="text-xs font-bold text-[var(--muted)] mb-2">No account found — share this invite link:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs text-[var(--ink)]">{inviteResult.inviteUrl}</code>
                  <CopyBtn text={inviteResult.inviteUrl} label="Copy link" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agents grid */}
        {agents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-2xl border border-[var(--line)] bg-white shadow-sm">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    {/* Avatar */}
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-gradient-to-br from-[#fce8f0] to-[#fde8dc]">
                        {agent.avatarUrl ? (
                          <Image src={agent.avatarUrl} alt={agent.name} fill sizes="44px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--brand)]">
                            {agent.name[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm">{agent.name}</p>
                          {agent.verified && <BadgeCheck className="h-3.5 w-3.5 text-[var(--sage)]" />}
                        </div>
                        <p className="text-xs text-[var(--muted)]">{agent.category}</p>
                      </div>
                    </div>

                    {/* Remove */}
                    {isBusiness && (
                      removeConfirm === agent.id ? (
                        <div className="flex flex-col items-end gap-1">
                          <p className="max-w-[160px] text-right text-[10px] leading-tight text-[var(--muted)]">
                            They keep their profile, services &amp; portfolio and become an independent freelancer.
                          </p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => removeAgent(agent.id)} disabled={removing === agent.id}
                              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">
                              {removing === agent.id ? "…" : "Remove"}
                            </button>
                            <button onClick={() => setRemoveConfirm(null)} className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background)]">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setRemoveConfirm(agent.id)}
                          className="rounded-lg p-1.5 text-[var(--line)] hover:bg-red-50 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Bio */}
                  {agent.bio && <p className="mt-2 text-xs leading-5 text-[var(--muted)] line-clamp-2">{agent.bio}</p>}

                  {/* Stats */}
                  <div className="mt-3 flex gap-3 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" />{agent.serviceCount} services</span>
                    <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{agent.bookingCount} bookings</span>
                  </div>

                  {/* Handle + joined */}
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                    <span className="font-mono">{agent.handle}</span>
                    <span>Joined {format(new Date(agent.joinedAt), "d MMM yyyy")}</span>
                  </div>

                  {/* Public team page URL */}
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--background)] px-2 py-1.5">
                    <Link2 className="h-3 w-3 shrink-0 text-[var(--muted)]" />
                    <code className="flex-1 truncate text-[11px] text-[var(--ink)]">
                      {businessSlug}.glowith.co.za/team/{agent.handle.replace("@", "")}
                    </code>
                    <CopyBtn text={`https://${businessSlug}.glowith.co.za/team/${agent.handle.replace("@", "")}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isBusiness ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--muted)]/30" />
            <p className="font-bold text-[var(--muted)]">No agents yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Invite a freelancer by email to add them to your team.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
