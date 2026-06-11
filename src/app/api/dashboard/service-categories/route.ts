import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const categories = await prisma.serviceCategory.findMany({
    where: { providerProfileId: profile.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { services: true } } }
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color, imageUrl } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const category = await prisma.serviceCategory.create({
    data: {
      providerProfileId: profile.id,
      name: name.trim(),
      color: color ?? "#D94472",
      imageUrl: imageUrl ?? null,
    },
    include: { _count: { select: { services: true } } }
  });

  return NextResponse.json({ category }, { status: 201 });
}
