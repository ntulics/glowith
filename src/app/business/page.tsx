import { PageShell, PageHeader } from "@/components/site/page-shell";
import { CalendarDays, Users, CreditCard, Star, MapPin, Images } from "lucide-react";

export const metadata = { title: "List your business | Glowith" };

const FEATURES = [
  { icon: CalendarDays, t: "Online bookings 24/7", d: "Clients book and pay deposits any time — no more back-and-forth DMs." },
  { icon: Users, t: "Team management", d: "Invite agents, verify them, and manage everyone's services and calendars." },
  { icon: CreditCard, t: "Secure deposits", d: "Collect deposits via Paystack (card, EFT, Apple Pay) to cut no-shows." },
  { icon: Images, t: "Portfolio that sells", d: "Show your best work with a beautiful, bookable portfolio." },
  { icon: Star, t: "Reviews & follows", d: "Build trust with real reviews and grow a following of repeat clients." },
  { icon: MapPin, t: "Get discovered", d: "Appear on the map and in local search for clients near you." }
];

export default function BusinessPage() {
  return (
    <PageShell maxWidth="max-w-5xl">
      <PageHeader kicker="For beauty professionals" title="Grow your beauty business with Glowith"
        intro="Salons, studios and freelancers across South Africa use Glowith to get discovered, take bookings and get paid — all in one place." />

      <div className="flex flex-wrap gap-3">
        <a href="/signup" className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-black text-white hover:bg-[var(--brand-dark)]">Get started free</a>
        <a href="/faq" className="rounded-xl border border-[var(--line)] bg-white px-6 py-3 text-sm font-bold">See how it works</a>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]/10"><Icon className="h-5 w-5 text-[var(--brand)]" /></div>
            <p className="mt-3 font-black">{t}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { name: "Starter", price: "Free", points: ["Storefront & portfolio", "Bookings & calendar", "Platform deposit applies"] },
          { name: "Pro", price: "R299/mo", points: ["Keep 100% — no deposit cut", "Custom branding", "All integrations"], highlight: true },
          { name: "Business", price: "R799/mo", points: ["Multi-agent management", "Company portfolio", "Priority support & API"] }
        ].map((p) => (
          <div key={p.name} className={`rounded-2xl border bg-white p-6 ${p.highlight ? "border-[var(--brand)]" : "border-[var(--line)]"}`}>
            {p.highlight && <span className="mb-2 inline-block rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">Most popular</span>}
            <p className="text-lg font-black">{p.name}</p>
            <p className="text-2xl font-black">{p.price}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">{p.points.map((x) => <li key={x}>· {x}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-[var(--ink)] p-8 text-center text-white">
        <h2 className="text-2xl font-black">Ready to glow?</h2>
        <p className="mt-2 text-white/80">Set up your profile in minutes — it&apos;s free to start.</p>
        <a href="/signup" className="mt-5 inline-block rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-black text-white hover:bg-[var(--brand-dark)]">List your business</a>
      </div>
    </PageShell>
  );
}
