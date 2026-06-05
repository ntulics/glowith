// Legal content for Glowith (South African beauty marketplace). Plain-language
// summaries — have these reviewed by a legal professional before relying on them.

export type LegalDoc = { title: string; updated: string; intro: string; sections: { q: string; a: string }[] };

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "June 2026",
    intro: "How Glowith collects, uses and protects your personal information, in line with South Africa's POPIA.",
    sections: [
      { q: "Who we are", a: "Glowith is a South African online beauty marketplace connecting clients with beauty professionals. We are the responsible party for personal information processed through glowith.co.za and our subdomains." },
      { q: "Information we collect", a: "Account details (name, email, password), your approximate or pin-set location, booking and payment metadata, messages, reviews, and usage data such as device and pages visited. Providers also share business details, services, portfolio images and bank/payout information." },
      { q: "How we use your information", a: "To create and manage your account, show nearby providers, process bookings and deposits, send notifications, prevent fraud, provide support, and improve the platform." },
      { q: "Payments", a: "Card and EFT payments are processed by Paystack. We do not store your full card details. Paystack processes your payment data under its own privacy terms." },
      { q: "Location data", a: "With your permission we use your device location (or a location you type/pin) to show nearby providers and approximate distances. You can disable location access in your browser at any time." },
      { q: "Sharing", a: "We share booking details with the relevant provider, payment data with our payment processor, and limited data with service providers who help us run Glowith (hosting, maps, email). We do not sell your personal information." },
      { q: "Your rights (POPIA)", a: "You may access, correct or delete your personal information, object to processing, and lodge a complaint with the Information Regulator. Email privacy@glowith.co.za to exercise your rights." },
      { q: "Retention & security", a: "We keep personal information only as long as needed for the purposes above or as required by law, and protect it with encryption in transit and access controls." },
      { q: "Contact", a: "Questions about privacy? Email privacy@glowith.co.za." }
    ]
  },
  terms: {
    title: "Terms of Service",
    updated: "June 2026",
    intro: "The terms governing your use of Glowith as a client or a beauty professional.",
    sections: [
      { q: "Acceptance", a: "By using Glowith you agree to these terms. If you don't agree, please don't use the platform." },
      { q: "Bookings", a: "Glowith is a marketplace that facilitates bookings between clients and independent providers. The service contract is between you and the provider — Glowith is not the provider of beauty services." },
      { q: "Deposits & payments", a: "Some providers require a deposit to confirm a booking, collected securely at checkout. Deposit, balance, cancellation and refund terms are set by each provider and shown before you pay." },
      { q: "Cancellations & no-shows", a: "Cancellation and refund rules are determined by each provider. Repeated no-shows may limit your ability to book." },
      { q: "Provider obligations", a: "Providers must hold any required qualifications/licences, describe services accurately, honour confirmed bookings, and comply with applicable laws and health & safety standards." },
      { q: "Fees & plans", a: "Listing is free to start; Glowith collects a platform deposit percentage on the free plan. Paid plans remove the platform deposit cut and add features, billed via our payment processor." },
      { q: "Acceptable use", a: "Don't misuse the platform, post unlawful or misleading content, or attempt to circumvent bookings/payments. We may suspend accounts that breach these terms." },
      { q: "Liability", a: "To the extent permitted by law, Glowith is not liable for the quality or outcome of services provided by professionals on the platform. Our liability is limited as set out in these terms." },
      { q: "Changes", a: "We may update these terms; continued use after changes means you accept them." }
    ]
  },
  "terms-of-use": {
    title: "Terms of Use",
    updated: "June 2026",
    intro: "Rules for using the Glowith website and apps.",
    sections: [
      { q: "Your account", a: "Keep your login details secure and don't share your account. You're responsible for activity under your account." },
      { q: "Content & reviews", a: "Reviews must reflect genuine experiences. Don't post defamatory, infringing or fraudulent content. You grant Glowith a licence to display content you submit (e.g. portfolio images, reviews)." },
      { q: "Intellectual property", a: "Glowith's name, logo and platform are our property. Provider content remains the provider's, licensed to us to operate the marketplace." },
      { q: "Prohibited conduct", a: "No scraping, reverse engineering, spamming, or interfering with the platform's operation or security." },
      { q: "Availability", a: "We aim for high availability but don't guarantee uninterrupted service and may change or discontinue features." }
    ]
  },
  cookies: {
    title: "Cookie Policy",
    updated: "June 2026",
    intro: "How and why Glowith uses cookies and similar technologies.",
    sections: [
      { q: "What are cookies?", a: "Small files stored on your device that help websites work and remember preferences." },
      { q: "Essential cookies", a: "Required for sign-in, security and core features like keeping you logged in and remembering your booking session." },
      { q: "Preferences", a: "Remember choices such as your location and theme so your experience is consistent." },
      { q: "Analytics", a: "Help us understand how the platform is used so we can improve it. These are only set where permitted." },
      { q: "Managing cookies", a: "You can control or delete cookies in your browser settings. Disabling essential cookies may break parts of Glowith." }
    ]
  },
  accessibility: {
    title: "Accessibility",
    updated: "June 2026",
    intro: "Our commitment to making Glowith usable for everyone.",
    sections: [
      { q: "Our commitment", a: "We aim to meet WCAG 2.1 AA guidelines and continually improve accessibility across the platform." },
      { q: "Features", a: "Keyboard navigation, sufficient colour contrast, a system-driven dark mode, semantic headings, and descriptive labels for interactive elements." },
      { q: "Known limitations", a: "Some third-party embeds (such as maps and payment widgets) may not fully meet our standards; we work with vendors to improve them." },
      { q: "Feedback", a: "Found an accessibility barrier? Email accessibility@glowith.co.za and we'll work to fix it." }
    ]
  }
};
