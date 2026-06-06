import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyTOTPCode } from "@/lib/totp";
import { sendEmail } from "@/lib/email";

const cookieDomain =
  process.env.NODE_ENV === "production"
    ? (process.env.AUTH_COOKIE_DOMAIN ?? ".glowith.co.za")
    : undefined;

// Helpers shared across providers
async function buildUserPayload(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true,
      providerProfile: {
        select: { handle: true, providerType: true, parentBusinessId: true }
      }
    }
  });
  if (!user) return null;

  let tenantSlug: string | null = null;
  const profile = user.providerProfile;
  if (profile) {
    if (profile.providerType === "BUSINESS") {
      tenantSlug = profile.handle.replace("@", "");
    } else if (profile.parentBusinessId) {
      const biz = await prisma.providerProfile.findUnique({
        where: { id: profile.parentBusinessId },
        select: { handle: true }
      });
      tenantSlug = biz?.handle.replace("@", "") ?? "freelancer";
    } else {
      tenantSlug = "freelancer";
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    handle: profile?.handle?.replace("@", "") ?? null,
    tenantSlug
  };
}

async function sendMFAEmailOTP(email: string): Promise<string> {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.verificationToken.deleteMany({ where: { identifier: `mfa_otp:${email}` } });
  await prisma.verificationToken.create({
    data: { identifier: `mfa_otp:${email}`, token: otpHash, expires }
  });

  await sendEmail({
    to: email,
    subject: "Your Glowith sign-in code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#E85D2F">Sign-in verification</h2>
        <p style="font-size:42px;font-weight:bold;letter-spacing:8px;color:#1a1a1a;margin:24px 0">${otp}</p>
        <p style="color:#666">This code expires in 5 minutes and can only be used once.</p>
        <p style="color:#999;font-size:13px">If you didn't try to sign in to Glowith, ignore this email.</p>
      </div>
    `,
    text: `Your Glowith sign-in code: ${otp} (expires in 5 minutes)`
  });

  return otp;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: true,
        domain: cookieDomain
      }
    }
  },
  pages: { signIn: "/login", error: "/login" },
  providers: [

    // ── Step 1: validate email + password ────────────────────────────────────
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { email: String(credentials.email).trim().toLowerCase() },
            select: {
              id: true, email: true, name: true, role: true,
              passwordHash: true,
              totpEnabled: true,
              providerProfile: {
                select: { handle: true, providerType: true, parentBusinessId: true }
              }
            }
          });

          if (!user?.passwordHash) return null;
          const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
          if (!valid) return null;

          // MFA required — TOTP app takes priority over email OTP
          const mfaMethod = user.totpEnabled ? "totp" : "email";

          // For email MFA: send OTP and create a ticket
          const ticket = crypto.randomBytes(20).toString("hex");
          const ticketHash = crypto.createHash("sha256").update(ticket).digest("hex");
          await prisma.verificationToken.deleteMany({ where: { identifier: `mfa_ticket:${user.email}` } });
          await prisma.verificationToken.create({
            data: {
              identifier: `mfa_ticket:${user.email}`,
              token: ticketHash,
              expires: new Date(Date.now() + 10 * 60 * 1000)
            }
          });

          if (mfaMethod === "email") {
            await sendMFAEmailOTP(user.email);
          }

          // Signal to the client that MFA is required
          // Format: MFA_REQUIRED|<email>|<ticket>|<method>
          throw new Error(`MFA_REQUIRED|${user.email}|${ticket}|${mfaMethod}`);
        } catch (err: any) {
          // Re-throw MFA errors so NextAuth encodes them in the redirect URL
          if (err.message?.startsWith("MFA_REQUIRED")) throw err;
          console.error("[auth] authorize error:", err.message);
          return null;
        }
      }
    }),

    // ── Step 2: complete MFA and issue session ────────────────────────────────
    Credentials({
      id: "mfa-complete",
      name: "mfa-complete",
      credentials: {
        email: {},
        ticket: {},
        code: {},
        method: {}
      },
      async authorize(credentials) {
        try {
          const { email, ticket, code, method } = credentials as Record<string, string>;
          if (!email || !ticket || !code) return null;

          const normalEmail = email.trim().toLowerCase();

          // 1. Validate the original ticket (proves they passed password check)
          const ticketHash = crypto.createHash("sha256").update(ticket).digest("hex");
          const ticketRecord = await prisma.verificationToken.findUnique({
            where: { identifier_token: { identifier: `mfa_ticket:${normalEmail}`, token: ticketHash } }
          });
          if (!ticketRecord || ticketRecord.expires < new Date()) return null;

          // 2. Validate the MFA code
          if (method === "totp") {
            const user = await prisma.user.findUnique({
              where: { email: normalEmail },
              select: { totpSecret: true, totpEnabled: true }
            });
            if (!user?.totpSecret || !user.totpEnabled) return null;
            if (!verifyTOTPCode(user.totpSecret, code)) return null;
          } else {
            // email OTP
            const otpHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
            const otpRecord = await prisma.verificationToken.findUnique({
              where: { identifier_token: { identifier: `mfa_otp:${normalEmail}`, token: otpHash } }
            });
            if (!otpRecord || otpRecord.expires < new Date()) return null;
            await prisma.verificationToken.delete({
              where: { identifier_token: { identifier: `mfa_otp:${normalEmail}`, token: otpHash } }
            });
          }

          // 3. Clean up ticket and return user
          await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: `mfa_ticket:${normalEmail}`, token: ticketHash } }
          });

          const user = await prisma.user.findUnique({ where: { email: normalEmail }, select: { id: true } });
          if (!user) return null;

          return await buildUserPayload(user.id);
        } catch (err: any) {
          console.error("[auth] mfa-complete error:", err.message);
          return null;
        }
      }
    }),

    // ── Passkey: complete after auth-verify issues a ticket ──────────────────
    Credentials({
      id: "passkey-complete",
      name: "passkey-complete",
      credentials: { email: {}, ticket: {} },
      async authorize(credentials) {
        try {
          const { email, ticket } = credentials as Record<string, string>;
          if (!email || !ticket) return null;
          const normalEmail = email.trim().toLowerCase();
          const ticketHash = crypto.createHash("sha256").update(ticket).digest("hex");
          const record = await prisma.verificationToken.findUnique({
            where: { identifier_token: { identifier: `passkey_verified:${normalEmail}`, token: ticketHash } }
          });
          if (!record || record.expires < new Date()) return null;
          await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: `passkey_verified:${normalEmail}`, token: ticketHash } }
          });
          const user = await prisma.user.findUnique({ where: { email: normalEmail }, select: { id: true } });
          if (!user) return null;
          return await buildUserPayload(user.id);
        } catch (err: any) {
          console.error("[auth] passkey-complete error:", err.message);
          return null;
        }
      }
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    }),

    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    }),

    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.handle = (user as any).handle;
        token.tenantSlug = (user as any).tenantSlug;
      }
      if (account && !["credentials", "mfa-complete", "passkey-complete"].includes(account.provider)) {
        const payload = await buildUserPayload(token.sub!);
        if (payload) {
          token.id = payload.id;
          token.role = payload.role;
          token.handle = payload.handle;
          token.tenantSlug = payload.tenantSlug;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id ?? token.sub;
        (session.user as any).role = token.role;
        (session.user as any).handle = token.handle;
        (session.user as any).tenantSlug = token.tenantSlug;
      }
      return session;
    }
  }
});

export { sendMFAEmailOTP };
