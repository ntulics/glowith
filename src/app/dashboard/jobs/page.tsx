import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { JobsView } from "@/components/dashboard/jobs-view";

export default async function JobsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) redirect("/login");

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) redirect("/signup");

  const [postings, applications] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { providerProfileId: profile.id },
      include: { applications: { include: { applicant: { select: { id: true, businessName: true, handle: true, avatarUrl: true, category: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    profile.parentBusinessId
      ? prisma.jobPosting.findMany({
          where: { published: true },
          include: { provider: { select: { businessName: true, handle: true, avatarUrl: true, city: true } } },
          orderBy: { createdAt: "desc" },
          take: 50
        })
      : Promise.resolve([])
  ]);

  return (
    <JobsView
      profileId={profile.id}
      providerType={profile.providerType}
      parentBusinessId={profile.parentBusinessId ?? null}
      postings={postings as any}
      availableJobs={applications as any}
    />
  );
}
