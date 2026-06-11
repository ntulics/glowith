import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const extras = await prisma.serviceExtra.findMany({
    where: { serviceId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ extras });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const extra = await prisma.serviceExtra.create({
    data: {
      serviceId: id,
      name: body.name.trim(),
      description: body.description ?? null,
      priceCents: Number(body.priceCents ?? 0),
      durationMinutes: Number(body.durationMinutes ?? 0),
    },
  });
  return NextResponse.json({ extra }, { status: 201 });
}
