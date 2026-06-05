import { PageShell, PageHeader } from "@/components/site/page-shell";

export const metadata = { title: "Careers | Glowith" };

export default function CareersPage() {
  return (
    <PageShell>
      <PageHeader kicker="Careers" title="Help South Africa glow"
        intro="We're a small, ambitious team building the home of beauty in South Africa. We hire for curiosity, craft and care." />
      <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
        <p>We don&apos;t have open roles posted right now, but we&apos;re always keen to meet brilliant people — engineers, designers, and community builders who love what we&apos;re building.</p>
        <p>Tell us why you&apos;d be a great fit at <a href="mailto:careers@glowith.co.za" className="font-bold text-[var(--brand)] hover:underline">careers@glowith.co.za</a>.</p>
      </div>
    </PageShell>
  );
}
