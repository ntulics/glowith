import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.clientId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow deleting cancelled or expired bookings
  if (booking.status !== "CANCELLED" && booking.status !== "EXPIRED") {
    return NextResponse.json({ error: "Only cancelled or expired bookings can be deleted" }, { status: 400 });
  }

  await prisma.booking.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
