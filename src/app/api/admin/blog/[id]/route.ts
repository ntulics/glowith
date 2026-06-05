import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/markdown";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  return user?.role === "ADMIN" ? user : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const wasPublished = existing.published;
  const willPublish = body.published !== undefined ? !!body.published : wasPublished;

  const data: Record<string, unknown> = {
    title: body.title?.toString().slice(0, 160) ?? existing.title,
    excerpt: body.excerpt?.toString().slice(0, 300) ?? existing.excerpt,
    coverImageUrl: body.coverImageUrl !== undefined ? (body.coverImageUrl || null) : existing.coverImageUrl,
    content: body.content?.toString() ?? existing.content,
    published: willPublish,
    publishedAt: willPublish && !wasPublished ? new Date() : existing.publishedAt
  };
  if (body.slug && slugify(body.slug) !== existing.slug) {
    const s = slugify(body.slug);
    if (s && !(await prisma.blogPost.findUnique({ where: { slug: s } }))) data.slug = s;
  }

  const post = await prisma.blogPost.update({ where: { id }, data });
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
