import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";

type AttendanceAction = "check_in" | "no_show" | "complete";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { id } = await params;
  const { action, confirmationCode } = await request.json().catch(() => ({})) as { action?: AttendanceAction; confirmationCode?: string };

  if (!["check_in", "no_show", "complete"].includes(action ?? "")) {
    return NextResponse.json({ error: "Invalid attendance action" }, { status: 400 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
  const scopedProfileIds = profile.parentBusinessId ? [profile.id] : [profile.id, ...profile.agents.map((a) => a.id)];

  const booking = await prisma.booking.findFirst({
    where: { id, providerProfileId: { in: scopedProfileIds } },
    include: { service: { select: { durationMinutes: true } } }
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "CANCELLED" || booking.status === "PENDING_DEPOSIT") {
    return NextResponse.json({ error: "Only confirmed appointments can be updated" }, { status: 400 });
  }
  if (action === "no_show" && Date.now() < booking.startsAt.getTime() + 10 * 60 * 1000) {
    return NextResponse.json({ error: "No-show can only be marked 10 minutes after the scheduled start time" }, { status: 400 });
  }

  let code = booking.checkInCode;
  if (!code || !booking.checkInCodeExpiresAt || booking.checkInCodeExpiresAt <= new Date()) {
    code = generateCheckInCode();
    await prisma.booking.update({
      where: { id },
      data: { checkInCode: code, checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes || booking.service.durationMinutes) }
    });
  }

  if (action === "check_in") {
    const submitted = (confirmationCode ?? "").replace(/\D/g, "");
    if (!submitted || submitted !== code) {
      return NextResponse.json({ error: "Ask the customer for their check-in code or scan their QR code." }, { status: 400 });
    }
  }

  const data =
    action === "check_in"
      ? { checkedInAt: new Date(), checkedInById: userId, noShowAt: null }
      : action === "no_show"
        ? { noShowAt: new Date(), checkedInAt: null, checkedInById: null, status: "COMPLETED" as const, completedAt: new Date() }
        : { status: "COMPLETED" as const, completedAt: new Date(), feedbackRequestedAt: new Date() };

  const updated = await prisma.booking.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      service: {
        select: {
          name: true,
          durationMinutes: true,
          priceCents: true,
          providerProfile: { select: { id: true, businessName: true } }
        }
      }
    }
  });

  return NextResponse.json({
    booking: {
      id: updated.id,
      status: updated.status,
      startsAt: updated.startsAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      checkedInAt: updated.checkedInAt?.toISOString() ?? null,
      noShowAt: updated.noShowAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
      feedbackRequestedAt: updated.feedbackRequestedAt?.toISOString() ?? null,
      notes: updated.notes,
      depositCents: updated.depositCents,
      durationMinutes: updated.service?.durationMinutes ?? updated.durationMinutes,
      service: updated.service?.name ?? "Service",
      agentName: updated.service?.providerProfile?.id !== profile.id ? updated.service?.providerProfile?.businessName ?? null : null,
      priceCents: updated.service?.priceCents ?? 0,
      client: {
        id: updated.client.id,
        name: updated.client.name,
        email: updated.client.email,
        image: updated.client.image
      }
    }
  });
}
