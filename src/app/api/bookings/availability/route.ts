import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSAPublicHoliday } from "@/lib/sa-holidays";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseWorkingHours(json: string | null | undefined, date: Date): { open: string; close: string } | null {
  if (!json) return null;
  try {
    const hours: Array<{ day: string; enabled: boolean; from: string; to: string }> = JSON.parse(json);
    const dayName = DAY_NAMES[date.getDay()];
    const entry = hours.find((h) => h.day === dayName);
    if (!entry || !entry.enabled) return null;
    return { open: entry.from, close: entry.to };
  } catch { return null; }
}

// Returns the busy intervals for a provider on a given date so the client
// can grey out taken slots. Public (needed before booking).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  if (!providerProfileId || !date) {
    return NextResponse.json({ error: "providerProfileId and date are required" }, { status: 400 });
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const now = new Date();

  // Resolve root business so blocked slots and settings from the parent apply to agents too
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { parentBusinessId: true, workOnPublicHolidays: true }
  });
  const rootProviderId = profile?.parentBusinessId ?? providerProfileId;

  // Load root provider settings (working hours + public holiday pref)
  const rootProfile = await prisma.providerProfile.findUnique({
    where: { id: rootProviderId },
    select: { workingHoursJson: true, workOnPublicHolidays: true }
  });

  // If the provider doesn't work public holidays, treat the whole day as blocked
  const requestDate = new Date(`${date}T12:00:00`);
  if (rootProfile?.workOnPublicHolidays === false && isSAPublicHoliday(requestDate)) {
    return NextResponse.json({
      busy: [{ start: `${date}T00:00:00.000Z`, durationMinutes: 1440, blocked: true, publicHoliday: true }],
      workingHours: null,
    });
  }

  const workingHours = parseWorkingHours(rootProfile?.workingHoursJson, requestDate);

  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: {
        providerProfileId,
        startsAt: { gte: dayStart, lte: dayEnd },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING_DEPOSIT", reservedUntil: { gt: now } },
        ],
      },
      select: { startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
    }),
    prisma.blockedSlot.findMany({
      where: {
        providerProfileId: rootProviderId,
        startsAt: { gte: dayStart, lte: dayEnd },
      },
      select: { startsAt: true, endsAt: true }
    })
  ]);

  const busy = [
    ...bookings.map((b) => ({
      start: b.startsAt.toISOString(),
      durationMinutes: b.durationMinutes || b.service.durationMinutes,
      blocked: false,
    })),
    ...blocked.map((s) => ({
      start: s.startsAt.toISOString(),
      durationMinutes: Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60000),
      blocked: true,
    })),
  ];
  return NextResponse.json({ busy, workingHours });
}
