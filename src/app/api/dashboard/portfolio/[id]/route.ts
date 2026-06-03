import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update a post's caption/tags (owner only).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const { id } = await params;
  const post = await prisma.portfolioPost.findUnique({ where: { id } });
  if (!post || post.providerProfileId !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { caption, tags } = await request.json();
  const updated = await prisma.portfolioPost.update({
    where: { id },
    data: {
      ...(caption !== undefined ? { caption: caption.toString().slice(0, 280) } : {}),
      ...(Array.isArray(tags) ? { tags: tags.slice(0, 10).map((t: string) => t.toString().slice(0, 30)) } : {})
    }
  });
  return NextResponse.json({ post: updated });
}

// Delete a post (owner only).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const { id } = await params;
  const post = await prisma.portfolioPost.findUnique({ where: { id } });
  if (!post || post.providerProfileId !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.portfolioPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
