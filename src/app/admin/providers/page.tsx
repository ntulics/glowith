import { prisma } from "@/lib/prisma";
import { ProvidersTable } from "@/components/admin/providers-table";

export default async function AdminProvidersPage() {
  const providers = await prisma.providerProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      _count: { select: { bookings: true, services: true, posts: true } }
    }
  });

  return (
    <ProvidersTable providers={providers.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      handle: p.handle,
      category: p.category,
      city: p.city,
      verified: p.verified,
      isDemo: p.isDemo,
      email: p.user.email,
      bookings: p._count.bookings,
      services: p._count.services,
      posts: p._count.posts,
      createdAt: p.createdAt.toISOString()
    }))} />
  );
}
