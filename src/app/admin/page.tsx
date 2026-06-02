import { prisma } from "@/lib/prisma";
import { AdminOverview } from "@/components/admin/admin-overview";

export default async function AdminPage() {
  const [
    totalProviders,
    pendingVerification,
    totalClients,
    totalBookings,
    recentBookings,
    recentProviders
  ] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.providerProfile.count({ where: { verified: false } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: true, service: true, providerProfile: true }
    }),
    prisma.providerProfile.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true, _count: { select: { bookings: true, services: true } } }
    })
  ]);

  const revenue = await prisma.booking.aggregate({
    _sum: { depositCents: true },
    where: { status: { in: ["CONFIRMED", "COMPLETED"] } }
  });

  return (
    <AdminOverview
      stats={{
        totalProviders,
        pendingVerification,
        totalClients,
        totalBookings,
        totalRevenueCents: revenue._sum.depositCents ?? 0
      }}
      recentBookings={recentBookings.map((b) => ({
        id: b.id,
        clientName: b.client.name,
        providerName: b.providerProfile.businessName,
        service: b.service.name,
        status: b.status,
        depositCents: b.depositCents,
        createdAt: b.createdAt.toISOString()
      }))}
      recentProviders={recentProviders.map((p) => ({
        id: p.id,
        businessName: p.businessName,
        handle: p.handle,
        category: p.category,
        city: p.city,
        verified: p.verified,
        bookings: p._count.bookings,
        services: p._count.services,
        createdAt: p.createdAt.toISOString()
      }))}
    />
  );
}
