import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/storage";

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

  const { caption, tags, featured } = await request.json();
  const updated = await prisma.portfolioPost.update({
    where: { id },
    data: {
      ...(caption !== undefined ? { caption: caption.toString().slice(0, 280) } : {}),
      ...(Array.isArray(tags) ? { tags: tags.slice(0, 10).map((t: string) => t.toString().slice(0, 30)) } : {}),
      ...(typeof featured === "boolean" ? { featured } : {})
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
  // Owner of the portfolio, or the agent who authored a company post, may delete it.
  if (!post || (post.providerProfileId !== profile.id && post.authorProfileId !== profile.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Remove all carousel blobs and reclaim the storage from the owning portfolio.
  const urls = (post.images?.length ? post.images : [post.imageUrl]);
  for (const u of urls) {
    const m = u.match(/\/api\/media\/(.+)$/);
    if (m) { try { await deleteBlob(decodeURIComponent(m[1])); } catch { /* ignore */ } }
  }
  await prisma.portfolioPost.delete({ where: { id } });
  if (post.sizeBytes > 0) {
    try { await prisma.providerProfile.update({ where: { id: post.providerProfileId }, data: { storageBytes: { decrement: post.sizeBytes } } }); } catch { /* ignore */ }
  }
  return NextResponse.json({ ok: true });
}
