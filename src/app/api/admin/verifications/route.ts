import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  return user?.role === "ADMIN" ? user : null;
}

// GET — list all verification requests
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.verificationRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      documents: true,
      providerProfile: { select: { id: true, businessName: true, handle: true, avatarUrl: true, verified: true } },
    },
  });

  return NextResponse.json({ requests });
}
