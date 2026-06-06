import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;

  const passkey = await prisma.passkey.findUnique({ where: { id }, select: { userId: true } });
  if (!passkey || passkey.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.passkey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
