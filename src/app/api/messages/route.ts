import { NextRequest, NextResponse } from "next/server";
import { createMessage, listMessages } from "@/lib/repositories";
import { messageSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get("providerId") ?? undefined;
  return NextResponse.json({ messages: listMessages(providerId) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({ message: createMessage(parsed.data) }, { status: 201 });
}
