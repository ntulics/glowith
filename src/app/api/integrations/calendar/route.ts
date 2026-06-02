import { NextResponse } from "next/server";
import { getCalendarAdapter } from "@/lib/adapters/calendar";
import { bookingSchema } from "@/lib/validators";
import type { CalendarProvider } from "@/domain/types";

export async function POST(request: Request) {
  const body = await request.json();
  const provider = (body.provider ?? "google") as CalendarProvider;
  const parsed = bookingSchema.extend({ id: bookingSchema.shape.providerId }).safeParse(body.booking);

  if (!parsed.success || !["google", "microsoft"].includes(provider)) {
    return NextResponse.json({ error: "Invalid calendar sync request" }, { status: 400 });
  }

  const result = await getCalendarAdapter(provider).syncBooking({
    ...parsed.data,
    status: "CONFIRMED",
    depositCents: 0
  });

  return NextResponse.json({ result });
}
