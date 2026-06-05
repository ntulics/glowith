import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageShell } from "@/components/site/page-shell";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return { title: "Post not found | Glowith" };
  return { title: `${post.title} | Glowith`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();

  const html = renderMarkdown(post.content);

  return (
    <PageShell maxWidth="max-w-3xl">
      <Link href="/blog" className="text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">← All posts</Link>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
        {post.publishedAt ? format(new Date(post.publishedAt), "d MMMM yyyy") : ""}{post.authorName ? ` · ${post.authorName}` : ""}
      </p>
      <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
      {post.excerpt && <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{post.excerpt}</p>}

      {post.coverImageUrl && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-[#f3e8e4]">
          <Image src={post.coverImageUrl} alt={post.title} fill sizes="768px" className="object-cover" priority />
        </div>
      )}

      <article className="blog-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </PageShell>
  );
}
