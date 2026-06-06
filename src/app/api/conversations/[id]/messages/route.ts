import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

// GET /api/conversations/[id]/messages — fetch messages (cursor paginated)
export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(request.url);
  const before = url.searchParams.get("before"); // cursor: createdAt ISO string
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);

  const member = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: me.id } }
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(before ? { createdAt: { lt: new Date(before) } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, name: true, image: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } }
    }
  });

  return NextResponse.json({ messages: messages.reverse() });
}

const sendSchema = z.object({ body: z.string().min(1).max(4000) });

// POST /api/conversations/[id]/messages — send a message
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const member = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: me.id } }
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: { conversationId: id, senderId: me.id, body: parsed.data.body },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      reactions: true
    }
  });

  await Promise.all([
    prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: me.id } },
      data: { lastReadAt: new Date() }
    })
  ]);

  return NextResponse.json({ message }, { status: 201 });
}
