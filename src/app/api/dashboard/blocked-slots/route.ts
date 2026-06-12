import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const slots = await prisma.blockedSlot.findMany({
    where: {
      providerProfileId: profile.id,
      ...(from && to ? { startsAt: { gte: new Date(from), lte: new Date(to) } } : {})
    },
    orderBy: { startsAt: "asc" }
  });

  return NextResponse.json({ slots });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { startsAt, endsAt, reason } = await request.json();
  if (!startsAt || !endsAt) return NextResponse.json({ error: "startsAt and endsAt required" }, { status: 400 });

  const slot = await prisma.blockedSlot.create({
    data: { providerProfileId: profile.id, startsAt: new Date(startsAt), endsAt: new Date(endsAt), reason: reason ?? null }
  });
  return NextResponse.json({ slot }, { status: 201 });
}
