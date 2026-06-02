import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CalendarView } from "@/components/dashboard/calendar-view";

export default async function CalendarPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: {
      bookings: {
        include: { client: true, service: true },
        where: { status: { not: "CANCELLED" } },
        orderBy: { startsAt: "asc" }
      }
    }
  });

  if (!profile) redirect("/signup");

  return (
    <CalendarView bookings={profile.bookings.map((b) => ({
      id: b.id,
      clientName: b.client.name,
      service: b.service.name,
      durationMinutes: b.service.durationMinutes,
      startsAt: b.startsAt.toISOString(),
      status: b.status,
      color: b.service.category === "Hair" ? "#D94472" : b.service.category === "Nails" ? "#7C3AED" : "#0891B2"
    }))} />
  );
}
