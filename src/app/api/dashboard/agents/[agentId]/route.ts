import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.providerType !== "BUSINESS") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { agentId } = await params;
  const agent = await prisma.providerProfile.findUnique({ where: { id: agentId } });
  if (!agent || agent.parentBusinessId !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Detach from the business. The agent keeps their own ProviderProfile —
  // services, portfolio, bio, handle and bookings all stay with them — and
  // becomes an independent freelancer at freelancer.glowith.co.za/{handle}.
  await prisma.providerProfile.update({ where: { id: agentId }, data: { parentBusinessId: null } });
  return NextResponse.json({ ok: true });
}
