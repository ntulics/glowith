import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: {
      bookings: {
        include: { client: true, service: true },
        orderBy: { startsAt: "asc" }
      },
      services: true
    }
  });

  if (!profile) redirect("/signup");

  // Stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthBookings = profile.bookings.filter((b) => new Date(b.startsAt) >= monthStart);
  const prevMonthBookings = profile.bookings.filter(
    (b) => new Date(b.startsAt) >= prevMonthStart && new Date(b.startsAt) < monthStart
  );

  const thisRevenue = thisMonthBookings.reduce((sum, b) => sum + b.depositCents, 0);
  const prevRevenue = prevMonthBookings.reduce((sum, b) => sum + b.depositCents, 0);

  const upcoming = profile.bookings
    .filter((b) => {
      const duration = b.durationMinutes || b.service.durationMinutes;
      const endsAt = new Date(b.startsAt.getTime() + duration * 60000);
      return b.status === "CONFIRMED" && !b.noShowAt && endsAt >= now;
    })
    .slice(0, 10);

  // Build daily revenue chart data (last 30 days)
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const label = d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
    const rev = profile.bookings
      .filter((b) => {
        const bd = new Date(b.startsAt);
        return bd.toDateString() === d.toDateString();
      })
      .reduce((sum, b) => sum + b.depositCents, 0);
    return { label, revenue: rev / 100 };
  });

  return (
    <DashboardHome
      stats={{
        totalBookings: thisMonthBookings.length,
        prevBookings: prevMonthBookings.length,
        revenue: thisRevenue,
        prevRevenue,
        clients: new Set(thisMonthBookings.map((b) => b.clientId)).size,
        prevClients: new Set(prevMonthBookings.map((b) => b.clientId)).size
      }}
      upcoming={upcoming.map((b) => ({
        id: b.id,
        clientName: b.client.name,
        service: b.service.name,
        startsAt: b.startsAt.toISOString(),
        checkedInAt: b.checkedInAt?.toISOString() ?? null,
        noShowAt: b.noShowAt?.toISOString() ?? null,
        status: b.status,
        priceCents: b.service.priceCents,
        depositCents: b.depositCents
      }))}
      chartData={chartData}
    />
  );
}
