import { NextResponse } from "next/server";
import { RoutedNotificationAdapter } from "@/lib/adapters/notification";
import type { NotificationChannel } from "@/domain/types";

const channels: NotificationChannel[] = ["whatsapp", "postmark", "smtp2go", "smtp"];

export async function POST(request: Request) {
  const body = await request.json();

  if (!channels.includes(body.channel) || !body.to || !body.template) {
    return NextResponse.json({ error: "Invalid notification request" }, { status: 400 });
  }

  const result = await new RoutedNotificationAdapter().send({
    channel: body.channel,
    to: body.to,
    template: body.template,
    variables: body.variables ?? {}
  });

  return NextResponse.json({ result });
}
