import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("handle") ?? "";
  const handle = raw.startsWith("@") ? raw : `@${raw}`;

  if (!/^@[a-z0-9]{2,30}$/.test(handle)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  // Always-reserved slugs — blocked from public registration regardless of DB seed
  const ALWAYS_RESERVED = new Set(["freelancer", "freelancers", "admin", "glowith", "support", "api", "www", "app", "dashboard"]);
  if (ALWAYS_RESERVED.has(handle.replace("@", "").toLowerCase())) {
    return NextResponse.json({ available: false, reason: "restricted" });
  }

  const [taken, restricted] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { handle }, select: { id: true } }),
    prisma.restrictedName.findFirst({
      where: { name: { equals: handle.replace("@", ""), mode: "insensitive" } }
    })
  ]);

  if (restricted) return NextResponse.json({ available: false, reason: "restricted" });
  if (taken) return NextResponse.json({ available: false, reason: "taken" });
  return NextResponse.json({ available: true });
}
