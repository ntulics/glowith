import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  return user?.role === "ADMIN" ? user : null;
}

// PUT — approve or reject a verification request
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, notes } = await request.json(); // action: "approve" | "reject"
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const vr = await prisma.verificationRequest.findUnique({
    where: { id },
    select: { id: true, providerProfileId: true, status: true },
  });
  if (!vr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (vr.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 409 });

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: { status: newStatus, reviewNotes: notes ?? null, reviewedAt: new Date(), reviewedById: admin.id },
    }),
    // On approval set provider as verified; on rejection leave unverified
    prisma.providerProfile.update({
      where: { id: vr.providerProfileId },
      data: { verified: action === "approve", verifiedBy: action === "approve" ? "GLOWITH" : undefined },
    }),
  ]);

  return NextResponse.json({ success: true });
}
