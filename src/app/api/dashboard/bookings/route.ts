import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const bookings = await prisma.booking.findMany({
    where: {
      providerProfileId: profile.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startsAt: { gte: dayStart }
    },
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      service: { select: { name: true, durationMinutes: true, priceCents: true } }
    },
    orderBy: { startsAt: "asc" }
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startsAt: b.startsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      checkedInAt: b.checkedInAt?.toISOString() ?? null,
      noShowAt: b.noShowAt?.toISOString() ?? null,
      notes: b.notes,
      depositCents: b.depositCents,
      durationMinutes: b.service?.durationMinutes ?? b.durationMinutes,
      service: b.service?.name ?? "Service",
      priceCents: b.service?.priceCents ?? 0,
      client: {
        id: b.client.id,
        name: b.client.name,
        email: b.client.email,
        image: b.client.image
      }
    }))
  });
}
