import { NextRequest, NextResponse } from "next/server";

const APEX_HOSTS = new Set(["glowith.co.za", "www.glowith.co.za", "localhost", "glowith.azurewebsites.net"]);

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const host = hostname.split(":")[0]; // strip port in dev

  // Extract subdomain — e.g. "lumestudio" from "lumestudio.glowith.co.za"
  const parts = host.split(".");
  const isApex = APEX_HOSTS.has(host) || parts.length < 3;

  if (isApex) {
    // Root domain — normal marketplace routing
    return NextResponse.next();
  }

  const slug = parts[0];

  // Rewrite /dashboard* to the tenant dashboard, passing slug as header
  const url = request.nextUrl.clone();

  // If already under /dashboard, just pass slug header through
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/login") || url.pathname.startsWith("/api")) {
    const response = NextResponse.next();
    response.headers.set("x-tenant-slug", slug);
    return response;
  }

  // Tenant subdomain root → their dashboard
  url.pathname = "/dashboard";
  const response = NextResponse.rewrite(url);
  response.headers.set("x-tenant-slug", slug);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"]
};
