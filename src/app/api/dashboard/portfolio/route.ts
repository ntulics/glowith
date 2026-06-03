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

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const { imageUrl, caption, tags } = await request.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });

  const post = await prisma.portfolioPost.create({
    data: {
      providerProfileId: profile.id,
      imageUrl,
      caption: (caption ?? "").toString().slice(0, 280),
      tags: Array.isArray(tags) ? tags.slice(0, 10).map((t: string) => t.toString().slice(0, 30)) : []
    }
  });
  return NextResponse.json({ post });
}
