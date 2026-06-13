import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

// Returns a provider's full public profile (shape used by ProviderProfilePage).
// Used to render an agent's profile natively inside the team popup.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const p = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, createdAt: true } },
      services: { where: { active: true }, orderBy: { createdAt: "asc" } },
      posts: { orderBy: { createdAt: "desc" } },
      parentBusiness: { select: { businessName: true, city: true } },
      agents: {
        select: {
          id: true,
          businessName: true,
          category: true,
          avatarUrl: true,
          handle: true,
          services: { where: { active: true }, orderBy: { createdAt: "asc" } }
        }
      },
      _count: { select: { bookings: true } }
    }
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      id: p.id,
      userId: p.userId,
      handle: p.handle,
      businessName: p.businessName,
      name: p.user.name,
      category: p.category,
      bio: p.bio,
      city: p.city,
      avatarUrl: mediaUrl(p.avatarUrl),
      verified: p.verified,
      verifiedBy: p.verifiedBy,
      mobile: p.mobile,
      studio: p.studio,
      providerType: p.providerType,
      parentBusinessName: p.parentBusiness?.businessName ?? null,
      parentBusinessCity: p.parentBusiness?.city ?? null,
      memberSince: p.user.createdAt.toISOString(),
      appointmentsCompleted: p._count.bookings,
      services: p.services.map((s) => ({
        id: s.id, name: s.name, category: s.category,
        durationMinutes: s.durationMinutes, priceCents: s.priceCents, depositCents: s.depositCents, depositIsPercent: s.depositIsPercent
      })),
      posts: p.posts.map((post) => ({
        id: post.id, caption: post.caption, imageUrl: mediaUrl(post.imageUrl) ?? post.imageUrl,
        images: (post.images?.length ? post.images : [post.imageUrl]).map((u) => mediaUrl(u) ?? u),
        tags: post.tags, likes: post.likes, saves: post.saves, featured: post.featured, serviceId: post.serviceId
      })),
      team: p.agents.map((agent) => ({
        id: agent.id,
        name: agent.businessName,
        role: agent.category,
        avatarUrl: mediaUrl(agent.avatarUrl),
        handle: agent.handle.replace("@", ""),
        services: agent.services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          depositCents: s.depositCents, depositIsPercent: s.depositIsPercent
        }))
      }))
    }
  });
}
