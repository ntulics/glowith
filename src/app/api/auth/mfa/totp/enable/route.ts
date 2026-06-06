// Verifies the first TOTP code and saves the secret to the user's account.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTOTPCode } from "@/lib/totp";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ secret: z.string().min(16), code: z.string().length(6) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Secret and 6-digit code required" }, { status: 400 });

  const { secret, code } = parsed.data;
  const userId = (session.user as any).id as string;

  // Verify the pending secret was issued by this server (not injected by client)
  const pendingHash = crypto.createHash("sha256").update(secret).digest("hex");
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: `totp_setup:${userId}`, token: pendingHash } }
  });
  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Setup session expired — start again" }, { status: 400 });
  }

  if (!verifyTOTPCode(secret, code)) {
    return NextResponse.json({ error: "Incorrect code — check your authenticator app" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: true }
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `totp_setup:${userId}`, token: pendingHash } }
    })
  ]);

  return NextResponse.json({ ok: true });
}
