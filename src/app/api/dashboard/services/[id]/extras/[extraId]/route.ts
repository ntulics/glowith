import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; extraId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { extraId } = await params;
  const body = await request.json();

  const extra = await prisma.serviceExtra.update({
    where: { id: extraId },
    data: {
      name: body.name?.trim(),
      description: body.description ?? null,
      priceCents: Number(body.priceCents ?? 0),
      durationMinutes: Number(body.durationMinutes ?? 0),
    },
  });
  return NextResponse.json({ extra });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; extraId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { extraId } = await params;
  await prisma.serviceExtra.delete({ where: { id: extraId } });
  return NextResponse.json({ ok: true });
}
