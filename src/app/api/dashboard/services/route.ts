import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  profileId: z.string().optional(),
  name: z.string().min(1),
  category: z.string(),
  categoryId: z.string().nullish(),
  description: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(15),
  priceCents: z.number().int().min(0),
  depositCents: z.number().int().min(0),
  depositIsPercent: z.boolean().optional().default(false),
  agentIds: z.array(z.string()).optional().default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { services: { orderBy: { createdAt: "asc" }, include: { agents: { select: { agentId: true } } } } }
  });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
  return NextResponse.json({ profileId: profile.id, services: profile.services });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userId = (session.user as any).id as string;
  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const { profileId: _profileId, agentIds, categoryId, ...rest } = parsed.data;
  const service = await prisma.service.create({
    data: {
      ...rest,
      categoryId: categoryId ?? null,
      providerProfileId: profile.id,
      agents: agentIds?.length ? { create: agentIds.map((id) => ({ agentId: id })) } : undefined,
    },
    include: { agents: { select: { agentId: true } } }
  });
  return NextResponse.json({ service }, { status: 201 });
}
