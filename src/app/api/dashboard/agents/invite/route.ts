import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.providerType !== "BUSINESS") {
    return NextResponse.json({ error: "Only business accounts can invite agents" }, { status: 403 });
  }
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const targetUser = await prisma.user.findUnique({ where: { email }, include: { providerProfile: true } });
  if (!targetUser?.providerProfile) {
    const inviteUrl = `${process.env.NEXTAUTH_URL ?? ""}/signup?businessId=${profile.id}&businessName=${encodeURIComponent(profile.businessName)}`;
    return NextResponse.json({ status: "invite_link", inviteUrl });
  }
  if (targetUser.providerProfile.parentBusinessId === profile.id) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }
  await prisma.providerProfile.update({ where: { id: targetUser.providerProfile.id }, data: { parentBusinessId: profile.id } });
  return NextResponse.json({ status: "added", agentId: targetUser.providerProfile.id, name: targetUser.name });
}
