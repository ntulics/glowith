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
      providerProfile: {
        select: {
          businessName: true, handle: true, city: true,
          cancelNoticeHours: true, cancelFeePercent: true,
          rescheduleNoticeHours: true, rescheduleFeePercent: true, policyText: true
        }
      }
    },
    orderBy: { startsAt: "desc" }
  });

  const bookingData = bookings.map((b) => ({
    id: b.id,
    status: b.status as "PENDING_DEPOSIT" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
    startsAt: b.startsAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    checkedInAt: b.checkedInAt?.toISOString() ?? null,
    noShowAt: b.noShowAt?.toISOString() ?? null,
    checkInCode: b.status === "CONFIRMED" && b.checkInCodeExpiresAt && b.checkInCodeExpiresAt > new Date() ? b.checkInCode : null,
    completedAt: b.completedAt?.toISOString() ?? null,
    feedbackRequestedAt: b.feedbackRequestedAt?.toISOString() ?? null,
    notes: b.notes ?? null,
    depositCents: b.depositCents,
    durationMinutes: b.service?.durationMinutes ?? b.durationMinutes,
    service: b.service?.name ?? "Service",
    provider: {
      name: b.providerProfile.businessName,
      handle: b.providerProfile.handle,
      city: b.providerProfile.city ?? null,
      cancelNoticeHours: b.providerProfile.cancelNoticeHours ?? null,
      cancelFeePercent: b.providerProfile.cancelFeePercent ?? null,
      rescheduleNoticeHours: b.providerProfile.rescheduleNoticeHours ?? null,
      rescheduleFeePercent: b.providerProfile.rescheduleFeePercent ?? null,
      policyText: b.providerProfile.policyText ?? null
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
