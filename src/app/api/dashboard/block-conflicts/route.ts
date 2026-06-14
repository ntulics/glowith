import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns CONFIRMED bookings that overlap a proposed block window.
// Used to warn the provider and offer reassignment before creating the block.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, parentBusinessId: true }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const startsAtStr = searchParams.get("startsAt");
  const endsAtStr = searchParams.get("endsAt");
  const agentProfileId = searchParams.get("agentProfileId");

  if (!startsAtStr || !endsAtStr) return NextResponse.json({ error: "startsAt and endsAt required" }, { status: 400 });

  const blockStart = new Date(startsAtStr);
  const blockEnd = new Date(endsAtStr);

  // Determine which provider profiles to check
  const rootId = profile.parentBusinessId ?? profile.id;
  let providerIds: string[];
  if (agentProfileId) {
    providerIds = [agentProfileId];
  } else {
    // business-wide block: check all agents
    const children = await prisma.providerProfile.findMany({
      where: { parentBusinessId: rootId },
      select: { id: true }
    });
    providerIds = [rootId, ...children.map((c) => c.id)];
  }

  const bookings = await prisma.booking.findMany({
    where: {
      providerProfileId: { in: providerIds },
      status: "CONFIRMED",
      startsAt: { lt: blockEnd },
    },
    select: {
      id: true,
      startsAt: true,
      durationMinutes: true,
      client: { select: { name: true } },
      service: { select: { name: true, durationMinutes: true } }
    }
  });

  const conflicts = bookings.filter((b) => {
    const bEnd = new Date(b.startsAt.getTime() + (b.durationMinutes || b.service.durationMinutes) * 60000);
    return b.startsAt < blockEnd && bEnd > blockStart;
  });

  return NextResponse.json({
    bookings: conflicts.map((b) => ({
      id: b.id,
      clientName: b.client.name ?? "Client",
      service: b.service.name,
      startsAt: b.startsAt.toISOString()
    }))
  });
}
