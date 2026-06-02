import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await request.json();

  const profile = await prisma.providerProfile.update({
    where: { userId: user.id },
    data: {
      businessName: body.businessName,
      bio: body.bio,
      city: body.city,
      mobile: body.mobile,
      studio: body.studio
    }
  });

  return NextResponse.json({ profile });
}
