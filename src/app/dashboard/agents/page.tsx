import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgentsView } from "@/components/dashboard/agents-view";

export default async function AgentsPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: {
      agents: {
        include: {
          user: { select: { name: true, email: true, createdAt: true } },
          _count: { select: { services: true, bookings: true, posts: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!profile) redirect("/signup");

  // Only business owners see this page; freelancers see info about joining
  return (
    <AgentsView
      businessName={profile.businessName}
      businessHandle={profile.handle}
      providerType={profile.providerType}
      businessId={profile.id}
      businessVerified={profile.verified}
      agents={profile.agents.map((a) => ({
        id: a.id,
        name: a.user.name,
        email: a.user.email,
        handle: a.handle,
        category: a.category,
        bio: a.bio,
        city: a.city,
        verified: a.verified,
        verifiedBy: a.verifiedBy,
        canPostToCompany: a.canPostToCompany,
        avatarUrl: a.avatarUrl,
        serviceCount: a._count.services,
        bookingCount: a._count.bookings,
        postCount: a._count.posts,
        joinedAt: a.createdAt.toISOString()
      }))}
    />
  );
}
