import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time endpoint to promote an existing user to ADMIN.
// Protected by ADMIN_BOOTSTRAP_SECRET env var — set this in Azure App Settings,
// use it once to promote yourself, then remove it.
//
// Usage:
//   POST /api/admin/bootstrap
//   Body: { "email": "you@example.com", "secret": "<ADMIN_BOOTSTRAP_SECRET>" }

export async function POST(request: Request) {
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!bootstrapSecret) {
    return NextResponse.json({ error: "Bootstrap not enabled" }, { status: 404 });
  }

  const body = await request.json();

  if (body.secret !== bootstrapSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" }
  });

  return NextResponse.json({ ok: true, message: `${user.email} promoted to ADMIN` });
}
