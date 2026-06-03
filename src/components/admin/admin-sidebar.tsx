"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  FlaskConical,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  Sparkles,
  Store,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/providers", label: "Providers", icon: Store },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/restricted-names", label: "Restricted Names", icon: ShieldAlert },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-100 bg-[#1a1a1a]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D94472]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">Glowith</p>
          <p className="truncate text-[10px] text-white/40">Super Admin</p>
        </div>
      </div>

      {/* Admin badge */}
      <div className="mx-3 mt-3 rounded-xl bg-[#D94472]/20 px-3 py-2 text-center">
        <p className="text-xs font-black text-[#D94472]">⚡ Platform Control</p>
        <p className="text-[10px] text-white/40">Full access</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[#D94472]/20 text-[#D94472]"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Back to studio + sign out */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/8 hover:text-white">
          <BookOpen className="h-4 w-4" />
          My studio
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
