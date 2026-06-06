import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRegistrationOptions } from "@/lib/webauthn";
import crypto from "crypto";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const options = await getRegistrationOptions(userId, user.email);

  // Store challenge for verification
  await prisma.verificationToken.deleteMany({ where: { identifier: `webauthn_reg:${userId}` } });
  await prisma.verificationToken.create({
    data: {
      identifier: `webauthn_reg:${userId}`,
      token: crypto.createHash("sha256").update(options.challenge).digest("hex"),
      expires: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return NextResponse.json(options);
}
