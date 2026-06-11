"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = { id: string; type: string; fileUrl: string };
type VR = {
  id: string;
  status: string;
  trigger: string;
  feeCents: number;
  paid: boolean;
  paymentRef: string | null;
  reviewNotes: string | null;
  createdAt: string;
  documents: Doc[];
  providerProfile: { id: string; businessName: string; handle: string; avatarUrl: string | null; verified: boolean };
};

const DOC_LABEL: Record<string, string> = {
  GOV_ID: "Government ID",
  PROOF_OF_ADDRESS: "Proof of Address",
  PROOF_OF_BANK: "Proof of Bank Account",
};

const TRIGGER_LABEL: Record<string, string> = {
  INITIAL: "Initial",
  BUSINESS_NAME_CHANGE: "Business name change",
  BANKING_CHANGE: "Banking change",
};

function ZAR(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VR[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/verifications");
    const d = await res.json();
    setRequests(d.requests ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function review(id: string, action: "approve" | "reject") {
    setActing(id + action);
    await fetch(`/api/admin/verifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes[id] ?? "" }),
    });
    setActing(null);
    load();
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  function Card({ vr }: { vr: VR }) {
    const open = expanded === vr.id;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition"
          onClick={() => setExpanded(open ? null : vr.id)}
        >
          {vr.providerProfile.avatarUrl
            ? <img src={vr.providerProfile.avatarUrl} className="h-10 w-10 rounded-full object-cover shrink-0" alt="" />
            : <div className="h-10 w-10 rounded-full bg-[#D94472]/10 flex items-center justify-center shrink-0 text-[#D94472] font-black text-sm">{vr.providerProfile.businessName[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{vr.providerProfile.businessName}</p>
            <p className="text-xs text-gray-500">@{vr.providerProfile.handle} · {TRIGGER_LABEL[vr.trigger]} · {ZAR(vr.feeCents)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", {
              "bg-amber-100 text-amber-700": vr.status === "PENDING",
              "bg-green-100 text-green-700": vr.status === "APPROVED",
              "bg-red-100 text-red-600": vr.status === "REJECTED",
            })}>{vr.status}</span>
            {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {open && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-4">
            {/* Documents */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Documents</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {vr.documents.map((doc) => (
                  <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:border-[#D94472] hover:text-[#D94472] transition">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{DOC_LABEL[doc.type] ?? doc.type}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </a>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Submitted: {new Date(vr.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span>Fee: {ZAR(vr.feeCents)} · {vr.paid ? <span className="text-green-600 font-semibold">Paid</span> : <span className="text-amber-600 font-semibold">Unpaid</span>}</span>
              {vr.paymentRef && <span>Ref: <span className="font-mono">{vr.paymentRef}</span></span>}
            </div>

            {/* Review notes + actions */}
            {vr.status === "PENDING" ? (
              <div className="space-y-3">
                <textarea
                  value={notes[vr.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [vr.id]: e.target.value }))}
                  placeholder="Review notes (optional)…"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#D94472] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => review(vr.id, "reject")} disabled={!!acting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 transition">
                    {acting === vr.id + "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                  <button onClick={() => review(vr.id, "approve")} disabled={!!acting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition">
                    {acting === vr.id + "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                </div>
              </div>
            ) : vr.reviewNotes ? (
              <p className="text-sm text-gray-500 italic">"{vr.reviewNotes}"</p>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Verifications</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 font-black text-sm uppercase tracking-wider text-gray-400">
                Pending review <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{pending.length}</span>
              </h2>
              {pending.length === 0
                ? <p className="text-sm text-gray-400">No pending requests.</p>
                : <div className="space-y-3">{pending.map((vr) => <Card key={vr.id} vr={vr} />)}</div>
              }
            </section>
            {reviewed.length > 0 && (
              <section>
                <h2 className="mb-3 font-black text-sm uppercase tracking-wider text-gray-400">Reviewed</h2>
                <div className="space-y-3">{reviewed.map((vr) => <Card key={vr.id} vr={vr} />)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
