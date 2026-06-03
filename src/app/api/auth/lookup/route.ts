import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (email === "bookings@demo.glowith.co.za") {
    return NextResponse.json({
      exists: true,
      firstName: "Glowith",
      role: "PROVIDER",
      handle: "demo",
      businessName: "Glowith Demo Salon"
    });
  }

  let user: {
    name: string;
    role: "CLIENT" | "PROVIDER" | "ADMIN";
    providerProfile: { handle: string; businessName: string } | null;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        name: true,
        role: true,
        providerProfile: { select: { handle: true, businessName: true } }
      }
    });
  } catch (error) {
    console.warn("[auth/lookup] Prisma lookup unavailable:", error);
  }

  if (!user) {
    return NextResponse.json({
      exists: false,
      firstName: "there",
      role: "CLIENT",
      handle: null,
      businessName: null
    });
  }

  return NextResponse.json({
    exists: true,
    firstName: firstName(user.name),
    role: user.role,
    handle: user.providerProfile?.handle?.replace("@", "") ?? null,
    businessName: user.providerProfile?.businessName ?? null
  });
}
