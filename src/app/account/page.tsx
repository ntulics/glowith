import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountPortal } from "@/components/account/account-portal";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;
  const userName = session!.user!.name ?? "";
  const userEmail = session!.user!.email ?? "";

  const bookings = await prisma.booking.findMany({
    where: { clientId: userId },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      providerProfile: { select: { businessName: true, handle: true, city: true } }
    },
    orderBy: { startsAt: "desc" }
  });

  const bookingData = bookings.map((b) => ({
    id: b.id,
    status: b.status as "PENDING_DEPOSIT" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
    startsAt: b.startsAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    notes: b.notes ?? null,
    depositCents: b.depositCents,
    durationMinutes: b.service?.durationMinutes ?? b.durationMinutes,
    service: b.service?.name ?? "Service",
    provider: {
      name: b.providerProfile.businessName,
      handle: b.providerProfile.handle,
      city: b.providerProfile.city ?? null
    }
  }));

  return (
    <AccountPortal
      userName={userName}
      userEmail={userEmail}
      initialBookings={bookingData}
    />
  );
}
