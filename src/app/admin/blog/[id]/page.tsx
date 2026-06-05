"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { marked } from "marked";
import { ArrowLeft, ImagePlus, Loader2, Eye, Pencil } from "lucide-react";

export default function BlogEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("# Heading\n\nStart writing your post in **Markdown**. Use `##` for subheadings, `>` for quotes, and `![alt](image-url)` for images.");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const inlineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;
    fetch("/api/admin/blog").then((r) => r.json()).then((d) => {
      const p = (d.posts ?? []).find((x: any) => x.id === id);
      if (p) { setTitle(p.title); setSlug(p.slug); setExcerpt(p.excerpt); setCoverImageUrl(p.coverImageUrl ?? ""); setContent(p.content); setPublished(p.published); }
    }).finally(() => setLoading(false));
  }, [id, isNew]);

  async function uploadImage(file: File, kind: "cover" | "inline") {
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      if (kind === "cover") setCoverImageUrl(d.url);
      else setContent((c) => `${c}\n\n![](${d.url})\n`);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  async function save(publish?: boolean) {
    setSaving(true); setError("");
    const willPublish = publish ?? published;
    const payload = { title, slug, excerpt, coverImageUrl, content, published: willPublish };
    try {
      const res = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${id}`, {
        method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      router.push("/admin/blog");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
        <button onClick={() => router.push("/admin/blog")} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> Blog</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">
            {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {preview ? "Edit" : "Preview"}
          </button>
          <button onClick={() => save(false)} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">Save draft</button>
          <button onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#D94472] px-4 py-2 text-sm font-bold text-white hover:bg-[#9f2852] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">{error}</p>}

          {/* Cover */}
          <div className="mb-5">
            {coverImageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImageUrl} alt="cover" className="h-48 w-full rounded-2xl object-cover" />
                <button onClick={() => setCoverImageUrl("")} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold">Remove</button>
              </div>
            ) : (
              <button onClick={() => coverRef.current?.click()} disabled={uploading}
                className="flex h-32 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#D94472] hover:text-[#D94472]">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />} Add a cover image
              </button>
            )}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title"
            className="w-full bg-transparent text-3xl font-black outline-none placeholder:text-gray-300" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="url-slug (optional)"
            className="mt-2 w-full bg-transparent text-sm text-gray-400 outline-none" />
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Short excerpt shown in listings…"
            className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />

          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => inlineRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Insert image
            </button>
            <span className="text-xs text-gray-400">Markdown supported · # heading · **bold** · &gt; quote · ![](image)</span>
            <input ref={inlineRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "inline")} />
          </div>

          {preview ? (
            <article className="blog-content mt-4 rounded-2xl border border-gray-100 bg-white p-6" dangerouslySetInnerHTML={{ __html: marked.parse(content, { async: false }) as string }} />
          ) : (
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20}
              className="mt-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-[#D94472]" />
          )}
        </div>
      </div>
    </div>
  );
}
