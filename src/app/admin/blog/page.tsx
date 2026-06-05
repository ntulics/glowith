"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, FileText, ExternalLink } from "lucide-react";

type Post = { id: string; slug: string; title: string; published: boolean; publishedAt: string | null; createdAt: string };

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/admin/blog").then((r) => r.json()).then((d) => setPosts(d.posts ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    setPosts((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94472]/10"><FileText className="h-5 w-5 text-[#D94472]" /></div>
          <h1 className="text-xl font-black">Blog</h1>
        </div>
        <Link href="/admin/blog/new" className="inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9f2852]"><Plus className="h-4 w-4" /> New post</Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <p className="text-gray-400">Loading…</p> : posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">No posts yet. Create your first post.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="px-4 py-3 font-bold">{p.title}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.published ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{p.published ? "Published" : "Draft"}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(p.publishedAt ?? p.createdAt), "d MMM yyyy")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/blog/${p.id}`} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><Pencil className="h-4 w-4" /></Link>
                        {p.published && <a href={`/blog/${p.slug}`} target="_blank" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><ExternalLink className="h-4 w-4" /></a>}
                        <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
