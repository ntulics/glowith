import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { status?: string; notes?: string };

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

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.booking.update({ where: { id }, data });
  return NextResponse.json({ booking: { id: updated.id, status: updated.status, notes: updated.notes } });
}
