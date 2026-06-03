import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });
  const agents = await prisma.providerProfile.findMany({
    where: { parentBusinessId: profile.id },
    include: { user: { select: { name: true, email: true } }, _count: { select: { services: true, bookings: true } } }
  });
  return NextResponse.json({ agents });
}
