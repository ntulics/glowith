import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const { id } = await params;

  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.blockedSlot.deleteMany({ where: { id, providerProfileId: profile.id } });
  return NextResponse.json({ ok: true });
}
