import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from "@simplewebauthn/server";
import type { AuthenticatorDevice, AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";

export const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";
export const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? "Glowith";
export const RP_ORIGIN = process.env.WEBAUTHN_ORIGIN ??
  (RP_ID === "localhost" ? "http://localhost:3000" : `https://${RP_ID}`);

export async function getRegistrationOptions(userId: string, email: string) {
  const existingPasskeys = await prisma.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true }
  });

  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userId,
    userName: email,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((p) => ({
      id: Buffer.from(p.credentialId, "base64url"),
      type: "public-key" as const,
      transports: (p.transports ? JSON.parse(p.transports) : []) as AuthenticatorTransportFuture[]
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred"
    }
  });
}

export async function verifyRegistration(
  response: Parameters<typeof verifyRegistrationResponse>[0]["response"],
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false
  });
}

export async function getAuthenticationOptions(email?: string) {
  let allowCredentials: Array<{ id: Buffer; type: "public-key"; transports?: AuthenticatorTransportFuture[] }> | undefined;

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { passkeys: { select: { credentialId: true, transports: true } } }
    });
    if (user?.passkeys.length) {
      allowCredentials = user.passkeys.map((p) => ({
        id: Buffer.from(p.credentialId, "base64url"),
        type: "public-key" as const,
        transports: (p.transports ? JSON.parse(p.transports) : []) as AuthenticatorTransportFuture[]
      }));
    }
  }

  return generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    ...(allowCredentials ? { allowCredentials } : {})
  });
}

export async function verifyAuthentication(
  credentialId: string,
  response: Parameters<typeof verifyAuthenticationResponse>[0]["response"],
  expectedChallenge: string
): Promise<{ verification: VerifiedAuthenticationResponse; userId: string }> {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId },
    select: { userId: true, publicKey: true, counter: true, transports: true }
  });

  if (!passkey) throw new Error("Passkey not found");

  const authenticator: AuthenticatorDevice = {
    credentialID: Buffer.from(credentialId, "base64url"),
    credentialPublicKey: new Uint8Array(passkey.publicKey),
    counter: Number(passkey.counter),
    transports: (passkey.transports ? JSON.parse(passkey.transports) : []) as AuthenticatorTransportFuture[]
  };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    authenticator,
    requireUserVerification: false
  });

  if (verification.verified) {
    await prisma.passkey.update({
      where: { credentialId },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsed: new Date()
      }
    });
  }

  return { verification, userId: passkey.userId };
}
