import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const agentIds: string[] = Array.isArray(body.agentIds) ? body.agentIds : [];

  // Replace agents: delete all then re-create
  await prisma.serviceAgent.deleteMany({ where: { serviceId: id } });

  const service = await prisma.service.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      categoryId: body.categoryId ?? null,
      description: body.description ?? null,
      durationMinutes: body.durationMinutes,
      priceCents: body.priceCents,
      depositCents: body.depositCents,
      depositIsPercent: body.depositIsPercent ?? false,
      agents: agentIds.length ? { create: agentIds.map((aid) => ({ agentId: aid })) } : undefined,
    },
    include: { agents: { select: { agentId: true } } }
  });
  return NextResponse.json({ service });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const service = await prisma.service.update({ where: { id }, data: { active: body.active } });
  return NextResponse.json({ service });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
