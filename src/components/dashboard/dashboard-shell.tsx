"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X, Sparkles } from "lucide-react";

interface Props {
  businessName: string;
  handle: string;
  role?: string;
  children: React.ReactNode;
}

export function DashboardShell({ businessName, handle, role, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: slide-in drawer */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-40 md:static md:block md:z-auto",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        ].join(" ")}
      >
        <Sidebar
          businessName={businessName}
          handle={handle}
          role={role}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D94472]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-black">Glowith</span>
          </div>
          <div className="ml-auto text-xs font-semibold text-gray-500 truncate max-w-[140px]">
            {businessName}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
