import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Follower count + whether the current user follows this provider.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  if (!providerProfileId) return NextResponse.json({ error: "providerProfileId required" }, { status: 400 });

  const session = await auth();
  const user = session?.user as any;

  const [followers, mine] = await Promise.all([
    prisma.follow.count({ where: { providerProfileId } }),
    user ? prisma.follow.findUnique({ where: { userId_providerProfileId: { userId: user.id, providerProfileId } } }) : null
  ]);
  return NextResponse.json({ followers, following: !!mine });
}

// Toggle follow. Following an agent also follows their company.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Please sign in to follow" }, { status: 401 });

  const { providerProfileId } = await request.json();
  if (!providerProfileId) return NextResponse.json({ error: "providerProfileId required" }, { status: 400 });

  const target = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { id: true, parentBusinessId: true }
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.follow.findUnique({
    where: { userId_providerProfileId: { userId: user.id, providerProfileId } }
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({ data: { userId: user.id, providerProfileId } });

  // Auto-follow the company when following one of its agents
  let alsoFollowedCompany = false;
  if (target.parentBusinessId) {
    await prisma.follow.upsert({
      where: { userId_providerProfileId: { userId: user.id, providerProfileId: target.parentBusinessId } },
      update: {},
      create: { userId: user.id, providerProfileId: target.parentBusinessId }
    });
    alsoFollowedCompany = true;
  }
  return NextResponse.json({ following: true, alsoFollowedCompany });
}
