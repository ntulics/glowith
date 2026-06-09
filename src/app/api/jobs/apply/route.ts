import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobPostingId, applicantId, coverLetter } = await req.json();

  const applicant = await prisma.providerProfile.findFirst({ where: { id: applicantId, userId: user.id } });
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.jobApplication.findUnique({ where: { jobPostingId_applicantId: { jobPostingId, applicantId } } });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 400 });

  const application = await prisma.jobApplication.create({
    data: { jobPostingId, applicantId, coverLetter: coverLetter ?? null }
  });

  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { status } = await req.json();

  const app = await prisma.jobApplication.findFirst({
    where: { id },
    include: { jobPosting: { include: { provider: true } } }
  });
  if (!app || app.jobPosting.provider.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.jobApplication.update({ where: { id }, data: { status } });
  return NextResponse.json({ application: updated });
}
