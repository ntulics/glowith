import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Search clients who have previously booked with this provider
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const scopedIds = profile.parentBusinessId
    ? [profile.id]
    : [profile.id, ...profile.agents.map(a => a.id)];

  const where = q
    ? {
        bookings: { some: { providerProfileId: { in: scopedIds } } },
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ]
      }
    : { bookings: { some: { providerProfileId: { in: scopedIds } } } };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, image: true },
    take: 10,
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ clients: users });
}
