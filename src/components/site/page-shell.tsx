import Link from "next/link";
import { SiteFooter } from "@/components/marketplace/site-footer";

export function PageShell({ children, maxWidth = "max-w-3xl" }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-[90rem] items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Glowith"><span role="img" aria-label="Glowith" className="logo-adaptive h-6" /></Link>
          <div className="ml-auto flex items-center gap-2">
            <a href="/business" className="hidden rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold sm:inline-flex">List your business</a>
            <a href="/login" className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">Log in</a>
          </div>
        </div>
      </header>

      <main className={`mx-auto ${maxWidth} px-4 py-12 sm:px-6 lg:py-16`}>{children}</main>

      <SiteFooter />
    </div>
  );
}

export function PageHeader({ kicker, title, intro }: { kicker?: string; title: string; intro?: string }) {
  return (
    <div className="mb-10">
      {kicker && <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand)]">{kicker}</p>}
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{intro}</p>}
    </div>
  );
}
