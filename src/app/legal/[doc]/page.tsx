import { notFound } from "next/navigation";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { Accordion } from "@/components/site/accordion";
import { LEGAL_DOCS } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = LEGAL_DOCS[doc];
  return { title: d ? `${d.title} | Glowith` : "Legal | Glowith" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = LEGAL_DOCS[doc];
  if (!d) notFound();

  return (
    <PageShell>
      <PageHeader kicker={`Updated ${d.updated}`} title={d.title} intro={d.intro} />
      <Accordion items={d.sections.map((s) => ({ q: s.q, a: s.a }))} defaultOpen={0} />
      <p className="mt-8 text-xs text-[var(--muted)]">
        This summary is provided for convenience and should be reviewed by a legal professional. For questions, email{" "}
        <a href="mailto:legal@glowith.co.za" className="font-bold text-[var(--brand)] hover:underline">legal@glowith.co.za</a>.
      </p>
    </PageShell>
  );
}
