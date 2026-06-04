import { readFile } from "fs/promises";
import path from "path";

// Serves brand images from /public/images via the app (filesystem read), because
// raw static serving of /public is unavailable in this deployment. Used by the
// CSS logo mask and the favicon.
const ALLOWED: Record<string, string> = {
  logo: "glowith-logo.png",
  icon: "glowith-icon.png",
  hero: "glowith-hero.png"
};

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = ALLOWED[file];
  if (!name) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "public/images", name));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
