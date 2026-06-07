import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

// Returns the staff/agents for a business provider so the booking flow can offer
// a "preferred artist" selection. Works for both business providers (agents are
// their own ProviderProfiles with parentBusinessId set) and standalone providers
// (returns an empty list so the step is skipped).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  if (!providerProfileId) {
    return NextResponse.json({ agents: [] });
  }

  const agents = await prisma.providerProfile.findMany({
    where: { parentBusinessId: providerProfileId },
    select: {
      id: true,
      handle: true,
      businessName: true,
      avatarUrl: true,
      category: true,
      services: {
        where: { active: true },
        select: { category: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      handle: a.handle,
      name: a.businessName,
      avatarUrl: mediaUrl(a.avatarUrl),
      category: a.category,
      serviceCategories: [...new Set(a.services.map((s) => s.category).filter(Boolean))]
    }))
  });
}
