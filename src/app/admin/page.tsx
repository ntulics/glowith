import { prisma } from "@/lib/prisma";
import { AdminOverview } from "@/components/admin/admin-overview";

const SERVER_CAPACITY_BYTES = 128 * 1024 * 1024 * 1024;

export default async function AdminPage() {
  const [
    totalProviders,
    pendingVerification,
    totalClients,
    totalBookings,
    recentBookings,
    recentProviders,
    dbSizeRows,
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
    }),
    prisma.$queryRaw<Array<{ db_bytes: bigint; server_used_bytes: bigint }>>`
      SELECT
        pg_database_size(current_database()) AS db_bytes,
        (SELECT sum(pg_database_size(datname)) FROM pg_database WHERE datname NOT IN ('azure_maintenance','azure_sys','template0','template1')) AS server_used_bytes
    `.catch(() => [{ db_bytes: BigInt(0), server_used_bytes: BigInt(0) }]),
  ]);

  const revenue = await prisma.booking.aggregate({
    _sum: { depositCents: true },
    where: { status: { in: ["CONFIRMED", "COMPLETED"] } }
  });

  const dbBytes = Number((dbSizeRows as any[])[0]?.db_bytes ?? 0);
  const serverUsedBytes = Number((dbSizeRows as any[])[0]?.server_used_bytes ?? 0);

  function fmtBytes(b: number) {
    if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
    if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`;
    return `${(b / 1024).toFixed(0)} KB`;
  }

  return (
    <AdminOverview
      stats={{
        totalProviders,
        pendingVerification,
        totalClients,
        totalBookings,
        totalRevenueCents: revenue._sum.depositCents ?? 0
      }}
      dbStats={{
        glowithDb: fmtBytes(dbBytes),
        serverUsed: fmtBytes(serverUsedBytes),
        serverCapacity: fmtBytes(SERVER_CAPACITY_BYTES),
        serverRemaining: fmtBytes(SERVER_CAPACITY_BYTES - serverUsedBytes),
        usagePercent: serverUsedBytes ? Math.round((serverUsedBytes / SERVER_CAPACITY_BYTES) * 100) : 0,
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
