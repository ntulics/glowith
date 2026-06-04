import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeQuery } from "@/lib/geocode";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await request.json();

  const existing = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { city: true }
  });

  const data: Record<string, unknown> = {
    businessName: body.businessName,
    bio: body.bio,
    city: body.city,
    mobile: body.mobile,
    studio: body.studio
  };

  // Exact pin from the map picker takes precedence.
  if (typeof body.latitude === "number" && typeof body.longitude === "number" && (body.latitude !== 0 || body.longitude !== 0)) {
    data.latitude = body.latitude;
    data.longitude = body.longitude;
  } else if (body.city && body.city !== existing?.city) {
    // Otherwise geocode the location text when it changes.
    const geo = await geocodeQuery(body.city);
    if (geo) {
      data.latitude = geo.lat;
      data.longitude = geo.lng;
    }
  }

  const profile = await prisma.providerProfile.update({
    where: { userId: user.id },
    data
  });

  return NextResponse.json({ profile });
}
