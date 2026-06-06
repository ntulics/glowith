"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Heart, Bookmark, ImagePlus, Loader2, Trash2, Images, Star } from "lucide-react";

type Post = {
  id: string; imageUrl: string; caption: string; tags: string[];
  likes: number; saves: number; featured: boolean; serviceId: string | null;
  providerProfileId: string; authorName: string | null;
};
type Svc = { id: string; name: string; priceCents: number };

export function PortfolioView({
  posts: initial,
  isBusiness,
  canPostToCompany,
  companyName,
  companyProfileId,
  ownProfileId,
  services = []
}: {
  posts: Post[];
  isBusiness: boolean;
  canPostToCompany: boolean;
  companyName: string | null;
  companyProfileId: string | null;
  ownProfileId: string;
  services?: Svc[];
}) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ url: string; sizeBytes: number }[]>([]);
  const [caption, setCaption] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  // Where a new post goes: own profile, or the company portfolio (if allowed & not the owner)
  const [target, setTarget] = useState<"self" | "company">(isBusiness ? "company" : "self");
  const [linkServiceId, setLinkServiceId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const showTargetToggle = canPostToCompany && !isBusiness;

  async function uploadOne(file: File): Promise<{ url: string; sizeBytes: number }> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "portfolio");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return { url: data.url, sizeBytes: data.sizeBytes ?? 0 };
  }
  async function createPost(imageUrl: string, cap: string, tags: string[], sizeBytes: number): Promise<Post> {
    const res = await fetch("/api/dashboard/portfolio", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, caption: cap, tags, target: isBusiness ? "company" : target, sizeBytes, serviceId: linkServiceId || null })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save");
    return data.post;
  }

  // Upload one or many photos, then collect a shared caption/tags before posting.
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError("");
    setUploading(true);
    try {
      const ups: { url: string; sizeBytes: number }[] = [];
      for (const f of files) ups.push(await uploadOne(f));
      setPending(ups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, featured } : p));
    await fetch(`/api/dashboard/portfolio/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featured })
    });
  }

  async function publish() {
    if (!pending.length) return;
    setSaving(true);
    setError("");
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const created: Post[] = [];
      for (const p of pending) created.push(await createPost(p.url, caption, tags, p.sizeBytes));
      setPosts((prev) => [...created, ...prev]);
      setPending([]);
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
          {!pending.length ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-10 text-gray-500 transition hover:border-[#D94472] hover:text-[#D94472] disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
              <span className="text-sm font-bold">{uploading ? "Uploading…" : "Upload photos"}</span>
              <span className="text-xs text-gray-400">Pick one or several · JPEG, PNG, WebP or GIF · up to 10 MB each</span>
            </button>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="shrink-0">
                <div className="grid w-full grid-cols-3 gap-2 sm:w-44 sm:grid-cols-2">
                  {pending.map((p, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <Image src={p.url} alt={`Photo ${i + 1}`} fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-center text-[11px] text-gray-400">{pending.length} photo{pending.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {showTargetToggle && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Post to</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setTarget("self")}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${target === "self" ? "border-[#D94472] bg-[#D94472]/5 text-[#D94472]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        My profile
                      </button>
                      <button type="button" onClick={() => setTarget("company")}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${target === "company" ? "border-[#D94472] bg-[#D94472]/5 text-[#D94472]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {companyName ?? "Company"}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Caption{pending.length > 1 ? " (applied to all)" : ""}</label>
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
                {services.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Link a service (optional)</label>
                    <select value={linkServiceId} onChange={(e) => setLinkServiceId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white">
                      <option value="">No service — photo only</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name} · R{Math.round(s.priceCents / 100)}</option>)}
                    </select>
                    <p className="mt-1 text-[11px] text-gray-400">Clients can book this service straight from the photo.</p>
                  </div>
                )}
                <div className="mt-auto flex gap-2">
                  <button type="button" onClick={publish} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#9f2852] disabled:opacity-60">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish {pending.length > 1 ? `${pending.length} photos` : ""}
                  </button>
                  <button type="button" onClick={() => { setPending([]); setCaption(""); setTagsInput(""); setLinkServiceId(""); }}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPickFile} className="hidden" />
          <p className="mt-2 text-center text-xs text-gray-400">Pick several photos to upload them together with one caption. Star a photo to feature it in your profile slider (up to 10).</p>
        </div>

        {/* Grid */}
        {posts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post) => (
              <div key={post.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative aspect-square bg-gray-100">
                  <Image src={post.imageUrl} alt={post.caption || "Portfolio photo"} fill sizes="(max-width:640px) 100vw, 25vw" className="object-cover" />
                  <button type="button" onClick={() => toggleFeatured(post.id, !post.featured)}
                    aria-label={post.featured ? "Unfeature" : "Feature"} title={post.featured ? "Featured in your slider" : "Feature in your slider"}
                    className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg shadow transition ${post.featured ? "bg-[#D94472] text-white" : "bg-white/90 text-gray-400 opacity-0 hover:text-[#D94472] group-hover:opacity-100"}`}>
                    <Star className={`h-4 w-4 ${post.featured ? "fill-white" : ""}`} />
                  </button>
                  <button type="button" onClick={() => remove(post.id)} disabled={deleting === post.id}
                    aria-label="Delete photo"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-500 opacity-0 shadow transition hover:text-red-500 group-hover:opacity-100">
                    {deleting === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
                <div className="p-3">
                  {companyProfileId && post.providerProfileId === companyProfileId && !isBusiness && (
                    <span className="mb-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">On company portfolio</span>
                  )}
                  {post.authorName && isBusiness && (
                    <span className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">by {post.authorName}</span>
                  )}
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
