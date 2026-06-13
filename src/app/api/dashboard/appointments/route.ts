import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const scopedProfileIds = profile.parentBusinessId
    ? [profile.id]
    : [profile.id, ...profile.agents.map((a) => a.id)];

  const bookings = await prisma.booking.findMany({
    where: { providerProfileId: { in: scopedProfileIds } },
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      service: { select: { name: true, durationMinutes: true, priceCents: true } },
      providerProfile: { select: { id: true, businessName: true, avatarUrl: true } }
    },
    orderBy: { startsAt: "asc" }
  });

  const now = new Date();

  const mapped = bookings.map((b) => {
    const duration = b.durationMinutes || b.service?.durationMinutes || 60;
    const endsAt = new Date(b.startsAt.getTime() + duration * 60000);
    // "Current" = checked in + not yet completed (even if overtime)
    const isCurrent = !!b.checkedInAt && !b.completedAt && !b.noShowAt && b.status === "CONFIRMED";

    return {
      id: b.id,
      status: b.status,
      startsAt: b.startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      checkedInAt: b.checkedInAt?.toISOString() ?? null,
      noShowAt: b.noShowAt?.toISOString() ?? null,
      completedAt: b.completedAt?.toISOString() ?? null,
      feedbackRequestedAt: b.feedbackRequestedAt?.toISOString() ?? null,
      depositCents: b.depositCents,
      durationMinutes: duration,
      service: b.service?.name ?? "Service",
      priceCents: b.service?.priceCents ?? 0,
      isCurrent,
      client: {
        id: b.client.id,
        name: b.client.name,
        email: b.client.email,
        image: mediaUrl(b.client.image) ?? b.client.image
      },
      agentName: b.providerProfile.id !== profile.id ? b.providerProfile.businessName : null
    };
  });

  return NextResponse.json({ appointments: mapped });
}
