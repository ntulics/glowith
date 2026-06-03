import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Business owner updates one of their agents: verify (as employer) or
// approve/revoke posting to the company portfolio.
export async function PATCH(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.providerType !== "BUSINESS") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { agentId } = await params;
  const agent = await prisma.providerProfile.findUnique({ where: { id: agentId } });
  if (!agent || agent.parentBusinessId !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.verified === "boolean") {
    // Only a Glowith-verified business may verify its own employees
    if (body.verified && !profile.verified) {
      return NextResponse.json({ error: "Your business must be verified by Glowith before you can verify agents" }, { status: 403 });
    }
    data.verified = body.verified;
    data.verifiedBy = body.verified ? "EMPLOYER" : null;
  }
  if (typeof body.canPostToCompany === "boolean") {
    data.canPostToCompany = body.canPostToCompany;
  }

  const updated = await prisma.providerProfile.update({ where: { id: agentId }, data });
  return NextResponse.json({ agent: updated });
}

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
