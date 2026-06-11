import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns the service if the user owns it directly OR owns it via their agent relationship
// (business owners can manage their agents' services).
async function getAccessibleService(userId: string, serviceId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, agents: { select: { id: true } } }
  });
  if (!profile) return null;

  const allowedProfileIds = [profile.id, ...profile.agents.map((a) => a.id)];
  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerProfileId: { in: allowedProfileIds } }
  });
  return service;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const owned = await getAccessibleService(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const agentIds: string[] = Array.isArray(body.agentIds) ? body.agentIds : [];

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
  const userId = (session.user as any).id as string;
  const owned = await getAccessibleService(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const service = await prisma.service.update({ where: { id }, data: { active: body.active } });
  return NextResponse.json({ service });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const owned = await getAccessibleService(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If the service has bookings we can't hard-delete (FK constraint).
  // Soft-delete instead so booking history is preserved.
  const bookingCount = await prisma.booking.count({ where: { serviceId: id } });
  if (bookingCount > 0) {
    await prisma.service.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, softDeleted: true });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
