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

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const blobPath = getBlobPath({
    providerType: profile.providerType,
    profileId: profile.id,
    parentBusinessId: profile.parentBusinessId,
    folder: folder as "profile" | "portfolio",
    filename
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadBlob(blobPath, buffer, file.type);

  // Serve via the same-origin media proxy so it renders even when the
  // storage container is private (no anonymous blob access required).
  const url = `/api/media/${blobPath.split("/").map(encodeURIComponent).join("/")}`;

  const sizeBytes = file.size;

  // If uploading a profile avatar, save it and count its storage immediately.
  // (Portfolio storage is counted when the post is created, so it can be
  // decremented again on delete.)
  if (folder === "profile") {
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { avatarUrl: url, storageBytes: { increment: sizeBytes } }
    });
  }

  return NextResponse.json({ url, blobPath, sizeBytes });
}
