import { prisma } from "@/lib/prisma";
import { ProvidersTable } from "@/components/admin/providers-table";
import { demoPasswordFor } from "@/lib/demo";

export default async function AdminProvidersPage() {
  const [providers, freelancerCount] = await Promise.all([
    prisma.providerProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        parentBusiness: { select: { businessName: true, handle: true } },
        _count: { select: { bookings: true, services: true, posts: true } }
      }
    }),
    prisma.providerProfile.count({ where: { providerType: "FREELANCER", parentBusinessId: null } })
  ]);

  // Persistent demo credentials — derived from the seeded demo accounts so they
  // always show for the super admin (not just right after seeding).
  const demoAccounts = providers
    .filter((p) => p.isDemo)
    .map((p) => ({
      label: p.parentBusinessId ? "Agent" : p.providerType === "BUSINESS" ? "Business" : "Freelancer",
      businessName: p.businessName,
      email: p.user.email,
      password: demoPasswordFor(p.parentBusinessId)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <ProvidersTable
      freelancerCount={freelancerCount}
      demoAccounts={demoAccounts}
      providers={providers.map((p) => ({
        id: p.id,
        businessName: p.businessName,
        handle: p.handle,
        category: p.category,
        city: p.city,
        verified: p.verified,
        isDemo: p.isDemo,
        providerType: p.providerType,
        plan: p.plan,
        parentBusinessId: p.parentBusinessId,
        parentBusinessName: p.parentBusiness?.businessName ?? null,
        parentBusinessHandle: p.parentBusiness?.handle ?? null,
        email: p.user.email,
        bookings: p._count.bookings,
        services: p._count.services,
        posts: p._count.posts,
        createdAt: p.createdAt.toISOString()
      }))}
    />
  );
}
