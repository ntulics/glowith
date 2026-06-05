import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List the signed-in provider's own portfolio posts.
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const posts = await prisma.portfolioPost.findMany({
    where: { providerProfileId: profile.id },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ posts });
}

// Create a portfolio post. Expects an already-uploaded image URL (via /api/upload).
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, businessName: true, providerType: true, parentBusinessId: true, canPostToCompany: true }
  });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const { imageUrl, caption, tags, target, sizeBytes } = await request.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  const bytes = Number.isFinite(sizeBytes) ? Math.max(0, Math.round(sizeBytes)) : 0;

  // Resolve which portfolio this post lands in.
  let providerProfileId = profile.id;
  let authorProfileId: string | null = null;
  let authorName: string | null = null;

  if (target === "company") {
    if (profile.providerType === "BUSINESS") {
      // Owner posting to their own company portfolio — providerProfileId stays the business
    } else if (profile.parentBusinessId && profile.canPostToCompany) {
      providerProfileId = profile.parentBusinessId;
      authorProfileId = profile.id;
      authorName = profile.businessName;
    } else {
      return NextResponse.json({ error: "You are not approved to post to the company portfolio" }, { status: 403 });
    }
  }

  const post = await prisma.portfolioPost.create({
    data: {
      providerProfileId,
      imageUrl,
      caption: (caption ?? "").toString().slice(0, 280),
      tags: Array.isArray(tags) ? tags.slice(0, 10).map((t: string) => t.toString().slice(0, 30)) : [],
      sizeBytes: bytes,
      authorProfileId,
      authorName
    }
  });
  // Count storage against the portfolio that holds the post (best-effort).
  if (bytes > 0) {
    try { await prisma.providerProfile.update({ where: { id: providerProfileId }, data: { storageBytes: { increment: bytes } } }); } catch { /* ignore */ }
  }
  return NextResponse.json({ post });
}
