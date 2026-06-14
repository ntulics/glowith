"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Check, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewTarget = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  existingStars: number | null;
  existingComment: string | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-8 w-8",
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function RatingCard({
  target, label, stars, onStars, comment, onComment
}: {
  target: ReviewTarget;
  label: string;
  stars: number;
  onStars: (v: number) => void;
  comment: string;
  onComment: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        {target.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={target.avatarUrl} alt={target.name} className="h-12 w-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-lg font-black">
            {target.name[0]}
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</p>
          <p className="font-black text-[var(--ink)]">{target.name}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-[var(--muted)]">Your rating</p>
        <StarPicker value={stars} onChange={onStars} />
        {stars > 0 && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {["", "Poor", "Fair", "Good", "Very good", "Excellent"][stars]}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={`What did you think of ${target.name}?`}
          className="w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
        />
      </div>
    </div>
  );
}

export function ReviewForm({
  bookingId, serviceName, startsAt, provider, agent
}: {
  bookingId: string;
  serviceName: string;
  startsAt: string;
  provider: ReviewTarget;
  agent: ReviewTarget | null;
}) {
  const router = useRouter();
  const [providerStars, setProviderStars] = useState(provider.existingStars ?? 0);
  const [providerComment, setProviderComment] = useState(provider.existingComment ?? "");
  const [agentStars, setAgentStars] = useState(agent?.existingStars ?? 0);
  const [agentComment, setAgentComment] = useState(agent?.existingComment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const alreadyReviewed = (provider.existingStars ?? 0) > 0;
  const [done, setDone] = useState(alreadyReviewed);
  const [error, setError] = useState("");

  const date = new Date(startsAt).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  async function submit() {
    if (providerStars === 0) { setError("Please rate your provider first"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch(`/api/account/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerStars, providerComment, agentStars: agentStars || undefined, agentComment: agentComment || undefined })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not submit review");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const displayProviderStars = provider.existingStars ?? providerStars;
    const displayAgentStars = agent ? (agent.existingStars ?? agentStars) : 0;
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[var(--ink)]">Review submitted</h1>
              <p className="text-sm text-[var(--muted)]">{serviceName} · {date}</p>
            </div>
          </div>
        </div>

        {/* Provider submitted rating */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            {provider.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={provider.avatarUrl} alt={provider.name} className="h-12 w-12 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-lg font-black">{provider.name[0]}</div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Provider</p>
              <p className="font-black text-[var(--ink)]">{provider.name}</p>
            </div>
          </div>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => <Star key={n} className={cn("h-5 w-5", n <= displayProviderStars ? "fill-amber-400 text-amber-400" : "fill-none text-gray-200")} />)}
          </div>
          {(provider.existingComment) && <p className="text-sm text-[var(--muted)]">"{provider.existingComment}"</p>}
        </div>

        {/* Agent submitted rating */}
        {agent && displayAgentStars > 0 && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 space-y-3">
            <div className="flex items-center gap-3">
              {agent.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.avatarUrl} alt={agent.name} className="h-12 w-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-lg font-black">{agent.name[0]}</div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Artist / Agent</p>
                <p className="font-black text-[var(--ink)]">{agent.name}</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => <Star key={n} className={cn("h-5 w-5", n <= displayAgentStars ? "fill-amber-400 text-amber-400" : "fill-none text-gray-200")} />)}
            </div>
            {(agent.existingComment) && <p className="text-sm text-[var(--muted)]">"{agent.existingComment}"</p>}
          </div>
        )}

        <button onClick={() => router.push("/account")}
          className="w-full rounded-xl bg-[var(--ink)] py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90">
          Back to my appointments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-black text-[var(--ink)]">Rate your appointment</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{serviceName} · {date}</p>
      </div>

      {/* Provider rating */}
      <RatingCard
        target={provider}
        label="Provider"
        stars={providerStars}
        onStars={setProviderStars}
        comment={providerComment}
        onComment={setProviderComment}
      />

      {/* Agent rating */}
      {agent && (
        <RatingCard
          target={agent}
          label="Artist / Agent"
          stars={agentStars}
          onStars={setAgentStars}
          comment={agentComment}
          onComment={setAgentComment}
        />
      )}

      {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting || providerStars === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)] disabled:opacity-50 transition"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit review{agent ? "s" : ""}
      </button>
    </div>
  );
}
