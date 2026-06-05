import { PageShell, PageHeader } from "@/components/site/page-shell";
import { Accordion } from "@/components/site/accordion";

export const metadata = { title: "FAQ | Glowith" };

const CLIENT_FAQS = [
  { q: "How do I book an appointment?", a: "Find a salon, studio or freelancer near you, open their profile, pick a service and time, and confirm. You'll create or sign in to your Glowith account and pay any required deposit to lock in your slot." },
  { q: "Do I need to pay a deposit?", a: "Some providers require a deposit to secure your booking. If so, you'll pay it securely at checkout (card, EFT or Apple Pay via Paystack). The balance is settled with the provider on the day." },
  { q: "Can I book more than one service at once?", a: "Yes. On a provider's booking page you can add multiple services — the total time and price update automatically before you choose a time slot." },
  { q: "How do I cancel or reschedule?", a: "Open the booking from your account and choose cancel or reschedule. Cancellation and deposit-refund terms are set by each provider and shown before you pay." },
  { q: "Are reviews from real clients?", a: "Yes. Ratings and reviews can only be left by signed-in users, so they reflect genuine experiences." },
  { q: "What's the difference between a salon, a freelancer and an agent?", a: "A salon (business) has its own page and may have several team members (agents). A freelancer works independently. When you book a business you can choose any team member; booking an agent books that specific pro." },
  { q: "Is my payment secure?", a: "Payments are processed by Paystack over an encrypted connection. Glowith never stores your full card details." }
];

const PROVIDER_FAQS = [
  { q: "How do I list my business?", a: "Tap 'List your business', choose Freelancer or Business, and set up your profile, services and portfolio. You'll be live in minutes." },
  { q: "What does it cost?", a: "Getting started is free. On the free plan Glowith collects a small deposit percentage on bookings. Paid plans remove the platform deposit cut and add extra features." },
  { q: "Can I add my team?", a: "Business accounts can invite agents by email, manage their access, verify them, and control who can post to the company portfolio." },
  { q: "How do clients pay me?", a: "Deposits are collected at booking via Paystack. You arrange the balance with the client. Connect your payout details in Settings → Payments." },
  { q: "Can I set my exact location?", a: "Yes — in Settings → Profile you can drag a pin on the map to set your exact spot, so clients see accurate distances." }
];

export default function FaqPage() {
  return (
    <PageShell>
      <PageHeader kicker="Help & Support" title="Frequently asked questions"
        intro="Everything you need to know about booking beauty and growing your business on Glowith." />

      <h2 className="mb-4 text-xl font-black">For clients</h2>
      <Accordion items={CLIENT_FAQS} defaultOpen={0} />

      <h2 className="mb-4 mt-12 text-xl font-black">For beauty professionals</h2>
      <Accordion items={PROVIDER_FAQS} />

      <p className="mt-10 text-center text-sm text-[var(--muted)]">
        Still stuck? <a href="/contact" className="font-bold text-[var(--brand)] hover:underline">Contact us</a>.
      </p>
    </PageShell>
  );
}
