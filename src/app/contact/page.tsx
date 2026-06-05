import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ContactForm } from "@/components/site/contact-form";
import { Mail, MessageCircle, Building2 } from "lucide-react";

export const metadata = { title: "Contact | Glowith" };

export default function ContactPage() {
  return (
    <PageShell maxWidth="max-w-4xl">
      <PageHeader kicker="Contact us" title="We'd love to hear from you"
        intro="Questions about a booking, your business, or a partnership? Drop us a message and we'll get back to you." />
      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <ContactForm />
        <div className="space-y-4">
          {[
            { icon: Mail, t: "Email", d: "hello@glowith.co.za" },
            { icon: MessageCircle, t: "Support", d: "Check our FAQ for quick answers", href: "/faq" },
            { icon: Building2, t: "For business", d: "List your business on Glowith", href: "/business" }
          ].map(({ icon: Icon, t, d, href }) => (
            <div key={t} className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[var(--brand)]" /><p className="font-bold">{t}</p></div>
              {href ? <a href={href} className="mt-1 block text-sm text-[var(--brand)] hover:underline">{d}</a> : <p className="mt-1 text-sm text-[var(--muted)]">{d}</p>}
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
