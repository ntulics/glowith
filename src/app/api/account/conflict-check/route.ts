import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

// Returns any confirmed booking the authenticated client already has that overlaps
// with the requested slot. Used to warn before double-booking.
export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ conflict: null });

  const { searchParams } = new URL(request.url);
  const startsAt = searchParams.get("startsAt");
  const duration = parseInt(searchParams.get("duration") ?? "60", 10);
  const excludeProviderProfileId = searchParams.get("excludeProviderId") ?? "";

  if (!startsAt) return NextResponse.json({ conflict: null });

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + duration * 60000);

  const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.booking.findMany({
    where: {
      clientId: user.id,
      bookingFor: "SELF",
      status: "CONFIRMED",
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      service: { select: { durationMinutes: true, name: true } },
      providerProfile: {
        select: {
          id: true,
          businessName: true,
          handle: true,
          avatarUrl: true,
          city: true,
          cancelNoticeHours: true,
          cancelFeePercent: true,
          parentBusinessId: true,
          parentBusiness: { select: { id: true, businessName: true, handle: true, avatarUrl: true, city: true, cancelNoticeHours: true, cancelFeePercent: true } }
        }
      }
    }
  });

  for (const b of existing) {
    const bStart = b.startsAt.getTime();
    const bEnd = bStart + (b.durationMinutes || b.service.durationMinutes) * 60000;
    const overlaps = start.getTime() < bEnd && end.getTime() > bStart;
    if (!overlaps) continue;

    // Skip if it's the same provider being re-booked (not a conflict)
    const bProviderId = b.providerProfile.parentBusinessId ?? b.providerProfile.id;
    if (excludeProviderProfileId && (bProviderId === excludeProviderProfileId || b.providerProfile.id === excludeProviderProfileId)) continue;

    const provider = b.providerProfile.parentBusiness ?? b.providerProfile;
    const depositCents = b.depositCents;
    const noticeHours = provider.cancelNoticeHours ?? 0;
    const feePercent = provider.cancelFeePercent ?? 0;
    const hoursUntilAppt = (bStart - Date.now()) / 3600000;
    const depositForfeited = noticeHours > 0 && hoursUntilAppt < noticeHours && feePercent > 0
      ? Math.round(depositCents * feePercent / 100)
      : 0;

    return NextResponse.json({
      conflict: {
        bookingId: b.id,
        service: b.service.name,
        startsAt: b.startsAt.toISOString(),
        depositCents,
        depositForfeited,
        provider: {
          name: provider.businessName,
          handle: provider.handle,
          avatarUrl: mediaUrl(provider.avatarUrl) ?? null,
          city: provider.city ?? null,
        }
      }
    });
  }

  return NextResponse.json({ conflict: null });
}
