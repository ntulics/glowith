import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Returns a provider's weekly working-hours schedule and public holiday preference.
// Lightweight — called once when the booking flow opens so the client can grey out
// unavailable days synchronously without 14 async round-trips.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  if (!providerProfileId) return NextResponse.json({ error: "providerProfileId required" }, { status: 400 });

  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { parentBusinessId: true }
  });
  const rootId = profile?.parentBusinessId ?? providerProfileId;

  const root = await prisma.providerProfile.findUnique({
    where: { id: rootId },
    select: { workingHoursJson: true, workOnPublicHolidays: true }
  });

  // Parse stored working hours JSON into a day-keyed map (0=Sunday … 6=Saturday)
  // null for days the provider doesn't work.
  const weeklySchedule: Record<number, { open: string; close: string } | null> = {};
  for (let i = 0; i < 7; i++) weeklySchedule[i] = null; // default all closed

  if (root?.workingHoursJson) {
    try {
      const hours: Array<{ day: string; enabled: boolean; from: string; to: string }> =
        JSON.parse(root.workingHoursJson);
      hours.forEach((h) => {
        const idx = DAY_NAMES.indexOf(h.day);
        if (idx !== -1) {
          weeklySchedule[idx] = h.enabled ? { open: h.from, close: h.to } : null;
        }
      });
    } catch { /* malformed JSON — leave all null */ }
  } else {
    // No schedule saved — default Mon–Fri 09:00–17:00
    for (let i = 1; i <= 5; i++) weeklySchedule[i] = { open: "09:00", close: "17:00" };
  }

  return NextResponse.json({
    weeklySchedule,
    workOnPublicHolidays: root?.workOnPublicHolidays ?? true,
  });
}
