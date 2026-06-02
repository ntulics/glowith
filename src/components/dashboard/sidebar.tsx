"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/catalog", label: "Catalog", icon: BookOpen },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

interface Props {
  businessName: string;
  handle: string;
  role?: string;
  onClose?: () => void;
}

export function Sidebar({ businessName, handle, role, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D94472]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">Glowith</p>
          <p className="truncate text-[10px] text-gray-400">Studio</p>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-gray-400 hover:bg-gray-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Business selector */}
      <div className="mx-3 mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{businessName}</p>
            <p className="truncate text-[10px] text-gray-400">{handle}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </div>
        {role === "ADMIN" && (
          <Link
            href="/admin"
            onClick={onClose}
            className="mt-1.5 block rounded-lg bg-[#D94472]/10 px-2 py-1 text-center text-[10px] font-black text-[#D94472] hover:bg-[#D94472]/20"
          >
            ⚡ Super Admin
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[#D94472]/8 text-[#D94472]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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

      {/* Sign out */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
