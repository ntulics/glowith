import { NextResponse } from "next/server";
import { getAuthenticationOptions } from "@/lib/webauthn";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ email: z.string().email().optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const email = parsed.success ? parsed.data.email : undefined;

  const options = await getAuthenticationOptions(email);

  // Store challenge keyed by the challenge itself (no session yet)
  const challengeHash = crypto.createHash("sha256").update(options.challenge).digest("hex");
  await prisma.verificationToken.deleteMany({ where: { identifier: `webauthn_auth:${challengeHash}` } });
  await prisma.verificationToken.create({
    data: {
      identifier: `webauthn_auth:${challengeHash}`,
      token: challengeHash,
      expires: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return NextResponse.json(options);
}
