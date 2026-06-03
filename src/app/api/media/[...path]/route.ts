import { NextResponse } from "next/server";
import { downloadBlob } from "@/lib/storage";

// Same-origin proxy for tenant blob storage. Streams private blobs so images
// render without making the container publicly readable.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const blobPath = path.map((p) => decodeURIComponent(p)).join("/");
  if (!blobPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const file = await downloadBlob(blobPath);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
