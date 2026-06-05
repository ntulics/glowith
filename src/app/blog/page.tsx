import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageShell, PageHeader } from "@/components/site/page-shell";

export const metadata = { title: "Blog | Glowith" };
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } }).catch(() => []);

  return (
    <PageShell maxWidth="max-w-5xl">
      <PageHeader kicker="The Glowith Blog" title="Beauty tips, trends & business growth"
        intro="Guides for looking your best — and for growing your beauty business in South Africa." />

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center text-[var(--muted)]">No posts yet — check back soon.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm transition hover:shadow-md">
              <div className="relative aspect-[16/10] bg-[#f3e8e4]">
                {p.coverImageUrl && <Image src={p.coverImageUrl} alt={p.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover transition group-hover:scale-105" />}
              </div>
              <div className="p-4">
                <p className="text-xs text-[var(--muted)]">{p.publishedAt ? format(new Date(p.publishedAt), "d MMM yyyy") : ""}</p>
                <h2 className="mt-1 font-black leading-snug group-hover:text-[var(--brand)]">{p.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
