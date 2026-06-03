import { NextRequest, NextResponse } from "next/server";

const APEX_HOSTS = new Set(["glowith.co.za", "www.glowith.co.za", "localhost", "glowith.azurewebsites.net"]);

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const host = hostname.split(":")[0];

  const parts = host.split(".");
  const isApex = APEX_HOSTS.has(host) || parts.length < 3;

  if (isApex) return NextResponse.next();

  const slug = parts[0];
  const url = request.nextUrl.clone();

  // ── freelancer.glowith.co.za ───────────────────────────────────────────────
  // /dashboard, /login, /api → pass through with slug header
  // /[handle]               → rewrite to public provider profile page
  // /                       → rewrite to apex marketplace (discovery page)
  if (slug === "freelancer") {
    if (
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/signup") ||
      url.pathname.startsWith("/api")
    ) {
      const res = NextResponse.next();
      res.headers.set("x-tenant-slug", "freelancer");
      return res;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 1) {
      // freelancer.glowith.co.za/naledi → public provider profile
      url.pathname = `/provider/@${segments[0]}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("x-tenant-slug", "freelancer");
      return res;
    }

    // Root → apex marketplace
    url.hostname = parts.slice(1).join(".");
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── Business subdomain (e.g. lumegroup.glowith.co.za) ─────────────────────
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/login") || url.pathname.startsWith("/api") || url.pathname.startsWith("/signup")) {
    const res = NextResponse.next();
    res.headers.set("x-tenant-slug", slug);
    return res;
  }

  // Subdomain root → tenant dashboard
  url.pathname = "/dashboard";
  const res = NextResponse.rewrite(url);
  res.headers.set("x-tenant-slug", slug);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"]
};
