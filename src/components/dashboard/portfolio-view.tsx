"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Heart, Bookmark, ImagePlus, Loader2, Trash2, Images } from "lucide-react";

type Post = {
  id: string; imageUrl: string; caption: string; tags: string[];
  likes: number; saves: number;
};

export function PortfolioView({ posts: initial }: { posts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "portfolio");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setPendingUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function publish() {
    if (!pendingUrl) return;
    setSaving(true);
    setError("");
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/dashboard/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: pendingUrl, caption, tags })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setPosts((prev) => [data.post, ...prev]);
      setPendingUrl(null);
      setCaption("");
      setTagsInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    await fetch(`/api/dashboard/portfolio/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94472]/10">
            <Images className="h-5 w-5 text-[#D94472]" />
          </div>
          <div>
            <h1 className="text-xl font-black">Portfolio</h1>
            <p className="text-xs text-gray-500">{posts.length} photo{posts.length !== 1 ? "s" : ""} · showcased on your public profile</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Uploader */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {!pendingUrl ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-10 text-gray-500 transition hover:border-[#D94472] hover:text-[#D94472] disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
              <span className="text-sm font-bold">{uploading ? "Uploading…" : "Upload a photo"}</span>
              <span className="text-xs text-gray-400">JPEG, PNG, WebP or GIF · up to 10 MB</span>
            </button>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-44">
                <Image src={pendingUrl} alt="New portfolio photo" fill sizes="176px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Caption</label>
                  <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={280}
                    placeholder="e.g. Ombre acrylics with hand-painted detail"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Tags (comma separated)</label>
                  <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="acrylics, ombre, nailart"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
                </div>
                <div className="mt-auto flex gap-2">
                  <button type="button" onClick={publish} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#9f2852] disabled:opacity-60">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish
                  </button>
                  <button type="button" onClick={() => { setPendingUrl(null); setCaption(""); setTagsInput(""); }}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPickFile} className="hidden" />
        </div>

        {/* Grid */}
        {posts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post) => (
              <div key={post.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative aspect-square bg-gray-100">
                  <Image src={post.imageUrl} alt={post.caption || "Portfolio photo"} fill sizes="(max-width:640px) 100vw, 25vw" className="object-cover" />
                  <button type="button" onClick={() => remove(post.id)} disabled={deleting === post.id}
                    aria-label="Delete photo"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-500 opacity-0 shadow transition hover:text-red-500 group-hover:opacity-100">
                    {deleting === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
                <div className="p-3">
                  {post.caption && <p className="line-clamp-2 text-sm font-semibold">{post.caption}</p>}
                  {post.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {post.tags.map((t) => (
                        <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex gap-3 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes}</span>
                    <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" />{post.saves}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <Images className="mb-3 h-10 w-10 text-gray-300" />
            <p className="font-bold text-gray-500">No photos yet</p>
            <p className="mt-1 text-sm text-gray-400">Upload your best work to showcase it on your public profile.</p>
          </div>
        )}
      </div>
    </div>
  );
}
