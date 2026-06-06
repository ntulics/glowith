import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthentication } from "@/lib/webauthn";
import { z } from "zod";
import crypto from "crypto";
import { signIn } from "@/lib/auth";

const schema = z.object({ response: z.any() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Recover raw challenge from client data
  const rawChallenge = parsed.data.response.response?.clientDataJSON
    ? JSON.parse(Buffer.from(parsed.data.response.response.clientDataJSON, "base64url").toString()).challenge
    : null;

  if (!rawChallenge) return NextResponse.json({ error: "Missing client data" }, { status: 400 });

  const challengeHash = crypto.createHash("sha256").update(rawChallenge).digest("hex");
  const stored = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: `webauthn_auth:${challengeHash}`, token: challengeHash } }
  });

  if (!stored || stored.expires < new Date()) {
    return NextResponse.json({ error: "Authentication session expired" }, { status: 400 });
  }

  try {
    const credentialId = parsed.data.response.id as string;
    const { verification, userId } = await verifyAuthentication(credentialId, parsed.data.response, rawChallenge);

    if (!verification.verified) {
      return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
    }

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `webauthn_auth:${challengeHash}`, token: challengeHash } }
    });

    // Issue a verified ticket that the client can use with the mfa-complete credentials provider
    // We reuse the mfa_ticket mechanism — passkeys bypass MFA entirely
    const ticket = crypto.randomBytes(20).toString("hex");
    const ticketHash = crypto.createHash("sha256").update(ticket).digest("hex");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.verificationToken.deleteMany({ where: { identifier: `passkey_verified:${user.email}` } });
    await prisma.verificationToken.create({
      data: {
        identifier: `passkey_verified:${user.email}`,
        token: ticketHash,
        expires: new Date(Date.now() + 2 * 60 * 1000)
      }
    });

    return NextResponse.json({ ok: true, email: user.email, ticket });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
