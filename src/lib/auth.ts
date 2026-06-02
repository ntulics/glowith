import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Note: PrismaAdapter is intentionally NOT used here.
// We use JWT sessions + credentials-only auth. PrismaAdapter is only needed
// for OAuth providers or database sessions — using it with credentials+JWT
// causes NextAuth to call createUser/linkAccount on sign-in which conflicts
// with our own user creation flow.

// Cookie domain — set to .glowith.co.za in production so the session cookie
// is valid across all subdomains (handle.glowith.co.za, admin.glowith.co.za, etc).
// Without the leading dot, a cookie set on glowith.co.za won't be sent to subdomains.
const cookieDomain =
  process.env.NODE_ENV === "production"
    ? (process.env.AUTH_COOKIE_DOMAIN ?? ".glowith.co.za")
    : undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
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
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            select: {
              id: true, email: true, name: true, role: true,
              passwordHash: true,
              providerProfile: { select: { handle: true } }
            }
          });

          if (!user || !user.passwordHash) return null;

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            handle: user.providerProfile?.handle?.replace("@", "") ?? null
          };
        } catch (err: any) {
          console.error("[auth] authorize error:", err.message);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.handle = (user as any).handle;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id ?? token.sub;
        (session.user as any).role = token.role;
        (session.user as any).handle = token.handle;
      }
      return session;
    }
  }
});
