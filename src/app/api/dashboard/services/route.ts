import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  profileId: z.string(),
  name: z.string().min(1),
  category: z.string(),
  durationMinutes: z.number().int().min(15),
  priceCents: z.number().int().min(0),
  depositCents: z.number().int().min(0)
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { profileId, ...rest } = parsed.data;
  const service = await prisma.service.create({
    data: { ...rest, providerProfile: { connect: { id: profileId } } }
  });
  return NextResponse.json({ service }, { status: 201 });
}
