import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

async function computeTenantSlug(profile: { handle: string; providerType: string; parentBusinessId: string | null } | null): Promise<string | null> {
  if (!profile) return null;
  if (profile.providerType === "BUSINESS") return profile.handle.replace("@", "");
  if (profile.parentBusinessId) {
    const biz = await prisma.providerProfile.findUnique({ where: { id: profile.parentBusinessId }, select: { handle: true } });
    return biz?.handle.replace("@", "") ?? "freelancer";
  }
  return "freelancer";
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  let user: {
    name: string;
    role: "CLIENT" | "PROVIDER" | "ADMIN";
    providerProfile: { handle: string; businessName: string; providerType: string; parentBusinessId: string | null } | null;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        name: true, role: true,
        providerProfile: { select: { handle: true, businessName: true, providerType: true, parentBusinessId: true } }
      }
    });
  } catch (error) {
    console.warn("[auth/lookup] Prisma lookup unavailable:", error);
  }

  if (!user) return NextResponse.json({ exists: false, firstName: "there", role: "CLIENT", handle: null, tenantSlug: null, businessName: null });

  const tenantSlug = await computeTenantSlug(user.providerProfile);

  return NextResponse.json({
    exists: true,
    firstName: firstName(user.name),
    role: user.role,
    handle: user.providerProfile?.handle?.replace("@", "") ?? null,
    tenantSlug,
    businessName: user.providerProfile?.businessName ?? null
  });
}
