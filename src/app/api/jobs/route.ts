import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { profileId, title, description, requirements, employmentType, salaryCents, salaryType, closingDate } = body;

  const profile = await prisma.providerProfile.findUnique({ where: { id: profileId, userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const posting = await prisma.jobPosting.create({
    data: {
      providerProfileId: profileId,
      title, description,
      requirements: requirements ?? null,
      employmentType: employmentType ?? "FULL_TIME",
      salaryCents: salaryCents ?? null,
      salaryType: salaryType ?? null,
      closingDate: closingDate ? new Date(closingDate) : null
    }
  });

  return NextResponse.json({ posting });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, title, description, requirements, employmentType, salaryCents, salaryType, closingDate } = body;

  const posting = await prisma.jobPosting.findFirst({
    where: { id, provider: { userId: user.id } }
  });
  if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.jobPosting.update({
    where: { id },
    data: { title, description, requirements: requirements ?? null, employmentType, salaryCents: salaryCents ?? null, salaryType: salaryType ?? null, closingDate: closingDate ? new Date(closingDate) : null }
  });

  return NextResponse.json({ posting: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const posting = await prisma.jobPosting.findFirst({ where: { id, provider: { userId: user.id } } });
  if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.jobPosting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
