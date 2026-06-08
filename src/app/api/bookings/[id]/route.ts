import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Expire a still-unpaid booking (e.g. the customer closed the payment popup).
// Keep it briefly in History so it is not confused with a cancellation.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.clientId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "PENDING_DEPOSIT") {
    await prisma.booking.update({ where: { id }, data: { status: "EXPIRED" } });
  }
  return NextResponse.json({ ok: true });
}
