import { NextResponse } from "next/server";

// Accepts a contact message. (For now it validates and acknowledges; wire to
// email/CRM later.)
export async function POST(request: Request) {
  const { name, email, message } = await request.json();
  if (!name || !email || !message || !String(email).includes("@")) {
    return NextResponse.json({ error: "Please fill in your name, a valid email and a message." }, { status: 400 });
  }
  console.log("[contact]", { name, email, message: String(message).slice(0, 500) });
  return NextResponse.json({ ok: true });
}
