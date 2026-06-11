import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, color, imageUrl } = await request.json();

  const category = await prisma.serviceCategory.update({
    where: { id },
    data: { name: name?.trim(), color, imageUrl },
    include: { _count: { select: { services: true } } }
  });

  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.serviceCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
