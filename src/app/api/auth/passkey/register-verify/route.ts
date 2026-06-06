import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyRegistration } from "@/lib/webauthn";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  response: z.any(),
  name: z.string().min(1).max(64).optional()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as any).id as string;

  // Recover the raw challenge from clientDataJSON
  const rawChallenge = parsed.data.response.response?.clientDataJSON
    ? JSON.parse(Buffer.from(parsed.data.response.response.clientDataJSON, "base64url").toString()).challenge as string
    : null;

  if (!rawChallenge) return NextResponse.json({ error: "Missing client data" }, { status: 400 });

  // Verify the stored challenge hash matches
  const challengeHash = crypto.createHash("sha256").update(rawChallenge).digest("hex");
  const stored = await prisma.verificationToken.findFirst({
    where: { identifier: `webauthn_reg:${userId}` }
  });
  if (!stored || stored.expires < new Date() || stored.token !== challengeHash) {
    return NextResponse.json({ error: "Registration session expired or invalid" }, { status: 400 });
  }

  try {
    const verification = await verifyRegistration(parsed.data.response, rawChallenge);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    const info = verification.registrationInfo;
    const credentialId = Buffer.from(info.credentialID).toString("base64url");

    await prisma.passkey.create({
      data: {
        userId,
        credentialId,
        publicKey: Buffer.from(info.credentialPublicKey),
        counter: BigInt(info.counter),
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
        transports: JSON.stringify([]),
        name: parsed.data.name ?? "Passkey"
      }
    });

    await prisma.verificationToken.deleteMany({ where: { identifier: `webauthn_reg:${userId}` } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
