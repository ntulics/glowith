import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

// Called by the popup's onSuccess. Verifies server-side and confirms the
// booking. The webhook remains the authoritative confirmation as a backstop.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference } = await request.json();
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { paymentIntentId: reference, clientId: user.id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { success } = await verifyTransaction(reference);
    if (success) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
      return NextResponse.json({ status: "CONFIRMED" });
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({ status: booking.status });
}
