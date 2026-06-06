// Returns a TOTP secret + QR code for the currently signed-in user.
// The secret is stored temporarily; it only becomes permanent after /enable.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTOTPSecret, buildTOTPQRCode } from "@/lib/totp";
import crypto from "crypto";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, totpEnabled: true }
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.totpEnabled) return NextResponse.json({ error: "TOTP already enabled" }, { status: 409 });

  const secret = generateTOTPSecret();
  const qrDataUrl = await buildTOTPQRCode(secret, user.email);

  // Store the pending secret in VerificationToken until the user verifies it
  const pendingHash = crypto.createHash("sha256").update(secret).digest("hex");
  await prisma.verificationToken.deleteMany({ where: { identifier: `totp_setup:${userId}` } });
  await prisma.verificationToken.create({
    data: {
      identifier: `totp_setup:${userId}`,
      token: pendingHash,
      expires: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  // Return secret in plain + QR (client keeps it only while the setup sheet is open)
  return NextResponse.json({ secret, qrDataUrl });
}
