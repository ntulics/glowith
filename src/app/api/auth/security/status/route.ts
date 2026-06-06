import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totpEnabled: true,
      passkeys: {
        select: { id: true, name: true, createdAt: true, lastUsed: true, deviceType: true, backedUp: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    totpEnabled: user.totpEnabled,
    passkeys: user.passkeys
  });
}
