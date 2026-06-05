import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBlobPath, uploadBlob } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, providerType: true, parentBusinessId: true }
  });
  if (!profile) return NextResponse.json({ error: "No provider profile found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) ?? "profile";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = rawExt || (file.type.split("/")[1] ?? "jpg");
  const filename = `${randomUUID()}.${ext}`;
  const blobPath = getBlobPath({
    providerType: profile.providerType,
    profileId: profile.id,
    parentBusinessId: profile.parentBusinessId,
    folder: folder === "portfolio" ? "portfolio" : "profile",
    filename
  });

  const sizeBytes = file.size;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadBlob(blobPath, buffer, file.type);
  } catch (e) {
    console.error("[upload] blob upload failed:", e);
    return NextResponse.json({ error: "Could not store the image. Please try again." }, { status: 500 });
  }

  // Serve via the same-origin media proxy so it renders even when the
  // storage container is private (no anonymous blob access required).
  const url = `/api/media/${blobPath.split("/").map(encodeURIComponent).join("/")}`;

  // If uploading a profile avatar, save it and count its storage (best-effort).
  if (folder === "profile") {
    try {
      await prisma.providerProfile.update({ where: { id: profile.id }, data: { avatarUrl: url, storageBytes: { increment: sizeBytes } } });
    } catch {
      await prisma.providerProfile.update({ where: { id: profile.id }, data: { avatarUrl: url } }).catch(() => {});
    }
  }

  return NextResponse.json({ url, blobPath, sizeBytes });
}
