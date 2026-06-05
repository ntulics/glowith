export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--line)] bg-[#fdfaf9] px-4 pt-14 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <span role="img" aria-label="Glowith" className="logo-adaptive h-8" />
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Glowith is South Africa&apos;s social beauty marketplace — connecting clients with top-rated hair, nail, makeup, and wellness professionals in their area.
            </p>
          </div>

          {/* About Glowith */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ink)]">About Glowith</h3>
            <ul className="mt-4 space-y-3">
              {[
                ["About us", "/about"],
                ["Contact us", "/contact"],
                ["Help & Support", "/faq"],
                ["Blog", "/blog"],
                ["Careers", "/careers"],
                ["List your business", "/business"]
              ].map(([label, href]) => (
                <li key={label}><a href={href} className="text-sm text-[var(--muted)] transition hover:text-[var(--brand)]">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ink)]">Legal</h3>
            <ul className="mt-4 space-y-3">
              {[
                ["Privacy Policy", "/privacy"],
                ["Terms of Service", "/terms"],
                ["Terms of Use", "/terms-of-use"],
                ["Cookie Policy", "/cookies"],
                ["Accessibility", "/accessibility"]
              ].map(([label, href]) => (
                <li key={label}><a href={href} className="text-sm text-[var(--muted)] transition hover:text-[var(--brand)]">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ink)]">Connect</h3>
            <ul className="mt-4 space-y-3">
              {[
                ["Instagram", "https://instagram.com"],
                ["TikTok", "https://tiktok.com"],
                ["Facebook", "https://facebook.com"],
                ["WhatsApp", "https://wa.me"]
              ].map(([label, href]) => (
                <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--muted)] transition hover:text-[var(--brand)]">{label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--line)] pt-6 sm:flex-row">
          <p className="text-xs text-[var(--muted)]">Made with love in South Africa 🇿🇦</p>
          <p className="text-center text-xs text-[var(--muted)]">© {year} Glowith (Pty) Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
