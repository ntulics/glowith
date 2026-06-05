import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PortfolioView } from "@/components/dashboard/portfolio-view";
import { mediaUrl } from "@/lib/media";

export default async function PortfolioPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { parentBusiness: { select: { id: true, businessName: true } } }
  });
  if (!profile) redirect("/signup");

  // Posts on my own portfolio + company posts I authored
  const posts = await prisma.portfolioPost.findMany({
    where: { OR: [{ providerProfileId: profile.id }, { authorProfileId: profile.id }] },
    orderBy: { createdAt: "desc" }
  });

  const isBusiness = profile.providerType === "BUSINESS";
  const canPostToCompany = isBusiness || (!!profile.parentBusinessId && profile.canPostToCompany);

  return (
    <PortfolioView
      isBusiness={isBusiness}
      canPostToCompany={canPostToCompany}
      companyName={isBusiness ? profile.businessName : profile.parentBusiness?.businessName ?? null}
      companyProfileId={isBusiness ? profile.id : profile.parentBusiness?.id ?? null}
      ownProfileId={profile.id}
      posts={posts.map((p) => ({
        id: p.id,
        imageUrl: mediaUrl(p.imageUrl) ?? p.imageUrl,
        caption: p.caption,
        tags: p.tags,
        likes: p.likes,
        saves: p.saves,
        featured: p.featured,
        providerProfileId: p.providerProfileId,
        authorName: p.authorName
      }))}
    />
  );
}
