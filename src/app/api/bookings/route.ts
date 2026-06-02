import { NextResponse } from "next/server";
import { getProvider, createBooking, listBookings } from "@/lib/repositories";
import { getPaymentAdapter } from "@/lib/adapters/payment";
import { bookingSchema } from "@/lib/validators";

export async function GET() {
  return NextResponse.json({ bookings: listBookings() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const provider = getProvider(parsed.data.providerId);
  const service = provider?.services.find((item) => item.id === parsed.data.serviceId);

  if (!provider || !service) {
    return NextResponse.json({ error: "Provider or service not found" }, { status: 404 });
  }

  const booking = createBooking({
    ...parsed.data,
    depositCents: service.depositCents
  });
  const deposit = await getPaymentAdapter().createDepositIntent({
    bookingId: booking.id,
    amountCents: booking.depositCents,
    customerEmail: booking.clientEmail
  });

  return NextResponse.json({ booking: { ...booking, paymentIntentId: deposit.id }, deposit }, { status: 201 });
}
