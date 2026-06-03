import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PortfolioView } from "@/components/dashboard/portfolio-view";

export default async function PortfolioPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { posts: { orderBy: { createdAt: "desc" } } }
  });

  if (!profile) redirect("/signup");

  return (
    <PortfolioView
      posts={profile.posts.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        caption: p.caption,
        tags: p.tags,
        likes: p.likes,
        saves: p.saves
      }))}
    />
  );
}
