import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadBlob } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const blobPath = `blog/${randomUUID()}.${ext}`;
  await uploadBlob(blobPath, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ url: `/api/media/${blobPath.split("/").map(encodeURIComponent).join("/")}` });
}
