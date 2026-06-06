// Disables TOTP — requires the user to confirm with a current TOTP code.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTOTPCode } from "@/lib/totp";
import { z } from "zod";

const schema = z.object({ code: z.string().length(6) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "6-digit code required" }, { status: 400 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true }
  });

  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "TOTP is not enabled" }, { status: 409 });
  }
  if (!verifyTOTPCode(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpEnabled: false }
  });

  return NextResponse.json({ ok: true });
}
