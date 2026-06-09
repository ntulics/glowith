"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Calendar,
  CalendarDays,
  Heart,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Settings,
  X,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/account", label: "My appointments", icon: Calendar, exact: true },
  { href: "/account/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { href: "/account/providers", label: "Providers near me", icon: MapPin, exact: false },
  { href: "/account/favourites", label: "Favourites", icon: Heart, exact: false },
  { href: "/account/messages", label: "Messages", icon: MessageCircle, exact: false },
  { href: "/account/settings", label: "Settings", icon: Settings, exact: false }
];

export function AccountShell({
  userName,
  userEmail,
  children
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firstName = userName.split(" ")[0] || "there";

  function isActive(item: typeof nav[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo + user */}
      <div className="border-b border-[var(--line)] px-5 py-4">
        <Link href="/" className="mb-4 inline-block">
          <span role="img" aria-label="Glowith" className="logo-adaptive h-7" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white text-sm font-bold">
            {firstName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--ink)]">{userName || "Account"}</p>
            <p className="truncate text-xs text-[var(--muted)]">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-[var(--ink)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-2 border-t border-[var(--line)] mt-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)] transition"
          >
            <Home className="h-4 w-4 shrink-0" />
            Browse providers
          </Link>
        </div>
      </nav>

      {/* Sign out */}
      <div className="border-t border-[var(--line)] px-3 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F9F5F3]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--line)] bg-white lg:flex lg:flex-col sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden">
            <div className="absolute right-3 top-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--ink)]"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span role="img" aria-label="Glowith" className="logo-adaptive h-6" />
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-white text-xs font-bold">
            {firstName[0]?.toUpperCase()}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
