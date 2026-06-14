import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    status?: string;
    notes?: string;
    startsAt?: string;
    agentProfileId?: string;
  };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const scopedIds = profile.parentBusinessId
    ? [profile.id]
    : [profile.id, ...profile.agents.map((a) => a.id)];

  const booking = await prisma.booking.findFirst({
    where: { id, providerProfileId: { in: scopedIds } }
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status === "CANCELLED") data.status = "CANCELLED";
  if (typeof body.notes === "string") data.notes = body.notes;
  if (body.startsAt) {
    const newStart = new Date(body.startsAt);
    if (isNaN(newStart.getTime())) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    data.startsAt = newStart;
    // Clear check-in state when rescheduled
    data.checkedInAt = null;
    data.checkedInById = null;
    data.checkInCode = null;
    data.checkInCodeExpiresAt = null;
    data.noShowAt = null;
    data.completedAt = null;
    data.status = "CONFIRMED";
  }

  if (body.agentProfileId) {
    // Validate agent belongs to this business
    const agent = await prisma.providerProfile.findFirst({
      where: { id: body.agentProfileId, parentBusinessId: profile.parentBusinessId ?? profile.id }
    });
    if (agent) data.providerProfileId = agent.id;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.booking.update({ where: { id }, data });
  return NextResponse.json({ booking: { id: updated.id, status: updated.status, notes: updated.notes, startsAt: updated.startsAt.toISOString() } });
}
