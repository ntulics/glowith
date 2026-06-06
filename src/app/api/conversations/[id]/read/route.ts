import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_: Request, { params }: Params) {
  const session = await auth();
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.conversationParticipant.updateMany({
    where: { conversationId: id, userId: me.id },
    data: { lastReadAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
