import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // For business providers, return blocked slots for the business AND all agents
  const profileIds = [profile.id, ...profile.agents.map((a) => a.id)];

  const slots = await prisma.blockedSlot.findMany({
    where: {
      providerProfileId: { in: profileIds },
      ...(from && to ? { startsAt: { gte: new Date(from), lte: new Date(to) } } : {})
    },
    include: { provider: { select: { id: true, businessName: true, parentBusinessId: true } } },
    orderBy: { startsAt: "asc" }
  });

  return NextResponse.json({
    slots: slots.map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      reason: s.reason,
      agentId: s.provider.parentBusinessId ? s.provider.id : null,
      agentName: s.provider.parentBusinessId ? s.provider.businessName : null,
    }))
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { startsAt, endsAt, reason, agentProfileId } = await request.json();
  if (!startsAt || !endsAt) return NextResponse.json({ error: "startsAt and endsAt required" }, { status: 400 });

  // If agentProfileId provided, validate it belongs to this business
  let targetProfileId = profile.id;
  if (agentProfileId) {
    const isOwnAgent = profile.agents.some((a) => a.id === agentProfileId);
    if (!isOwnAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    targetProfileId = agentProfileId;
  }

  const slot = await prisma.blockedSlot.create({
    data: { providerProfileId: targetProfileId, startsAt: new Date(startsAt), endsAt: new Date(endsAt), reason: reason ?? null }
  });
  return NextResponse.json({ slot }, { status: 201 });
}
