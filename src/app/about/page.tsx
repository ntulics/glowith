import { PageShell, PageHeader } from "@/components/site/page-shell";

export const metadata = { title: "About | Glowith" };

export default function AboutPage() {
  return (
    <PageShell>
      <PageHeader kicker="About Glowith" title="Beauty, booked beautifully."
        intro="Glowith is South Africa's social beauty marketplace — connecting clients with top-rated hair, nail, makeup and wellness professionals in their area." />

      <div className="space-y-6 text-base leading-8 text-[var(--muted)]">
        <p>
          We started Glowith with a simple belief: finding and booking a great beauty professional should be as
          effortless as the glow you walk away with. From salons and studios to independent freelancers, Glowith
          brings the best of local beauty into one place — with real portfolios, honest reviews and instant booking.
        </p>
        <p>
          Whether you&apos;re after a fresh silk press, flawless gel nails, bridal glam or a sharp fade, you can
          discover trusted pros near you, see their work, and secure your slot in seconds — deposit and all.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { n: "Discover", d: "Browse top-rated salons, freelancers and studios near you, by treatment and distance." },
          { n: "Book instantly", d: "Pick your service, time and pro — confirm with a secure deposit in seconds." },
          { n: "Glow", d: "Show up, get pampered, and leave a review to help your community glow too." }
        ].map((c) => (
          <div key={c.n} className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <p className="font-black text-[var(--brand)]">{c.n}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{c.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-[var(--brand)] p-8 text-center text-white">
        <h2 className="text-2xl font-black">Run a beauty business?</h2>
        <p className="mt-2 text-white/90">Reach new clients, manage bookings and grow with Glowith.</p>
        <a href="/business" className="mt-5 inline-block rounded-xl bg-white px-6 py-3 text-sm font-black text-[var(--brand)]">List your business</a>
      </div>
    </PageShell>
  );
}
