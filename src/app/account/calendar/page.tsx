import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountCalendar } from "@/components/account/account-calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  // Fetch all bookings for the next 12 months + past 3 months
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setMonth(to.getMonth() + 12);

  const bookings = await prisma.booking.findMany({
    where: {
      clientId: userId,
      startsAt: { gte: from, lte: to },
      status: { not: "CANCELLED" }
    },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      providerProfile: { select: { id: true, handle: true, businessName: true } }
    },
    orderBy: { startsAt: "asc" }
  });

  const bookingData = bookings.map((b) => ({
    id: b.id,
    status: b.status as string,
    startsAt: b.startsAt.toISOString(),
    durationMinutes: b.durationMinutes || b.service.durationMinutes,
    serviceName: b.service.name,
    providerName: b.providerProfile.businessName,
    providerHandle: b.providerProfile.handle,
    providerProfileId: b.providerProfile.id
  }));

  return <AccountCalendar initialBookings={bookingData} />;
}
