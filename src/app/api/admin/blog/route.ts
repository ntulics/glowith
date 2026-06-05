import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/markdown";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  return user?.role === "ADMIN" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const title = (body.title ?? "Untitled").toString().slice(0, 160);
  let slug = body.slug ? slugify(body.slug) : slugify(title);
  if (!slug) slug = `post-${Date.now()}`;
  // ensure unique slug
  if (await prisma.blogPost.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const post = await prisma.blogPost.create({
    data: {
      slug, title,
      excerpt: (body.excerpt ?? "").toString().slice(0, 300),
      coverImageUrl: body.coverImageUrl || null,
      content: (body.content ?? "").toString(),
      published: !!body.published,
      publishedAt: body.published ? new Date() : null,
      authorName: user.name ?? "Glowith"
    }
  });
  return NextResponse.json({ post });
}
