import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.verified === "boolean") {
    data.verified = body.verified;
    // Glowith (admin) is the verifying authority here
    data.verifiedBy = body.verified ? "GLOWITH" : null;
  }
  if (typeof body.isDemo === "boolean") data.isDemo = body.isDemo;
  if (typeof body.plan === "string" && ["STARTER", "PRO", "BUSINESS"].includes(body.plan)) data.plan = body.plan;

  const profile = await prisma.providerProfile.update({ where: { id }, data });
  return NextResponse.json({ profile });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Cascade deletes user which cascades to providerProfile via onDelete: Cascade
  const profile = await prisma.providerProfile.findUnique({ where: { id }, select: { userId: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id: profile.userId } });
  return NextResponse.json({ ok: true });
}
