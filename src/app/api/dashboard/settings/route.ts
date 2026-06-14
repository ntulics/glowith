import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeQuery } from "@/lib/geocode";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      workingHoursJson: true,
      workOnPublicHolidays: true,
      providerType: true,
      cancelNoticeHours: true,
      cancelFeePercent: true,
      rescheduleNoticeHours: true,
      rescheduleFeePercent: true,
      policyText: true,
      agents: { select: { id: true, businessName: true, avatarUrl: true } }
    }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    workingHoursJson: profile.workingHoursJson ?? null,
    workOnPublicHolidays: profile.workOnPublicHolidays,
    providerType: profile.providerType,
    cancelNoticeHours: profile.cancelNoticeHours ?? null,
    cancelFeePercent: profile.cancelFeePercent ?? null,
    rescheduleNoticeHours: profile.rescheduleNoticeHours ?? null,
    rescheduleFeePercent: profile.rescheduleFeePercent ?? null,
    policyText: profile.policyText ?? null,
    agents: profile.agents.map((a) => ({ id: a.id, name: a.businessName, avatarUrl: a.avatarUrl })),
  });
}

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

  if (body.workingHours !== undefined) {
    data.workingHoursJson = JSON.stringify(body.workingHours);
  }
  if (typeof body.workOnPublicHolidays === "boolean") {
    data.workOnPublicHolidays = body.workOnPublicHolidays;
  }
  if (body.cancelNoticeHours !== undefined) data.cancelNoticeHours = body.cancelNoticeHours === "" || body.cancelNoticeHours === null ? null : Number(body.cancelNoticeHours);
  if (body.cancelFeePercent !== undefined) data.cancelFeePercent = body.cancelFeePercent === "" || body.cancelFeePercent === null ? null : Number(body.cancelFeePercent);
  if (body.rescheduleNoticeHours !== undefined) data.rescheduleNoticeHours = body.rescheduleNoticeHours === "" || body.rescheduleNoticeHours === null ? null : Number(body.rescheduleNoticeHours);
  if (body.rescheduleFeePercent !== undefined) data.rescheduleFeePercent = body.rescheduleFeePercent === "" || body.rescheduleFeePercent === null ? null : Number(body.rescheduleFeePercent);
  if (body.policyText !== undefined) data.policyText = body.policyText || null;

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
