import { NextResponse } from "next/server";

// After a web OAuth flow initiated from the iOS app (via ASWebAuthenticationSession),
// NextAuth sets the session cookie and redirects here. We redirect to the custom
// URL scheme so ASWebAuthenticationSession completes and the app can call
// /api/auth/session to pick up the cookie.
export async function GET() {
  return NextResponse.redirect("glowith://auth/callback");
}
