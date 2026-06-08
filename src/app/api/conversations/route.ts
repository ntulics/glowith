import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { messageWindowOpen } from "@/lib/booking-attendance";

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  const session = await auth();
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: me.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, image: true, role: true, providerProfile: { select: { handle: true, businessName: true, avatarUrl: true } } } }
            }
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } }
          }
        }
      }
    },
    orderBy: { conversation: { updatedAt: "desc" } }
  });

  const conversations = memberships.map((m) => {
    const other = m.conversation.participants.find((p) => p.userId !== me.id);
    const lastMsg = m.conversation.messages[0];
    const unread = lastMsg && m.lastReadAt ? lastMsg.createdAt > m.lastReadAt && lastMsg.sender.id !== me.id : !!lastMsg && lastMsg.sender.id !== me.id;
    return {
      id: m.conversation.id,
      updatedAt: m.conversation.updatedAt,
      other: other?.user ?? null,
      lastMessage: lastMsg ? { body: lastMsg.body, senderId: lastMsg.sender.id, senderName: lastMsg.sender.name, createdAt: lastMsg.createdAt } : null,
      unread,
    };
  });

  return NextResponse.json({ conversations });
}

const createSchema = z.object({
  // recipientId is the userId of the person to message
  recipientId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

// POST /api/conversations — start (or resume) a conversation and send first message
export async function POST(request: Request) {
  const session = await auth();
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { recipientId, body } = parsed.data;
  if (recipientId === me.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, role: true, providerProfile: { select: { id: true } } }
  });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const sender = await prisma.user.findUnique({
    where: { id: me.id },
    select: { role: true, providerProfile: { select: { id: true } } }
  });

  // Permission: providers can only initiate a customer conversation when there is
  // an upcoming/current booking, or within 24 hours after a completed booking.
  const senderIsProvider = sender?.role === "PROVIDER";
  const recipientIsClient = recipient.role === "CLIENT";
  if (senderIsProvider && recipientIsClient && sender.providerProfile) {
    const bookings = await prisma.booking.findMany({
      where: {
        clientId: recipientId,
        providerProfileId: sender.providerProfile.id,
        status: { in: ["CONFIRMED", "COMPLETED"] }
      },
      select: {
        startsAt: true,
        durationMinutes: true,
        status: true,
        completedAt: true,
        noShowAt: true,
        service: { select: { durationMinutes: true } }
      }
    });
    const allowed = bookings.some((booking) => messageWindowOpen({
      startsAt: booking.startsAt,
      durationMinutes: booking.durationMinutes || booking.service.durationMinutes,
      status: booking.status,
      completedAt: booking.completedAt,
      noShowAt: booking.noShowAt
    }));
    if (!allowed) {
      return NextResponse.json({ error: "You can message customers only for upcoming/current bookings, or for 24 hours after completion." }, { status: 403 });
    }
  }

  // Find existing conversation between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: me.id } } },
        { participants: { some: { userId: recipientId } } },
      ]
    }
  });

  let conversationId: string;
  if (existing) {
    conversationId = existing.id;
  } else {
    const conv = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: me.id },
            { userId: recipientId }
          ]
        }
      }
    });
    conversationId = conv.id;
  }

  const message = await prisma.message.create({
    data: { conversationId, senderId: me.id, body },
    include: { sender: { select: { id: true, name: true, image: true } }, reactions: true }
  });

  // Bump conversation updatedAt
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  // Mark sender as read
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: me.id } },
    data: { lastReadAt: new Date() }
  });

  return NextResponse.json({ conversationId, message }, { status: 201 });
}
