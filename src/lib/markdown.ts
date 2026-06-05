import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(md: string): string {
  return marked.parse(md ?? "", { async: false }) as string;
}

export function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
