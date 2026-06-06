import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ emoji: z.string().min(1).max(10) });

// POST — toggle an emoji reaction on a message
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: messageId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });

  const { emoji } = parsed.data;

  // Verify user is a participant in the conversation containing this message
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true }
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: message.conversationId, userId: me.id } }
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: me.id, emoji } }
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed" });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId: me.id, emoji } });
    return NextResponse.json({ action: "added" });
  }
}
