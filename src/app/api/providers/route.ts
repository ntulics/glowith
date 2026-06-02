import { NextRequest, NextResponse } from "next/server";
import { listProviders } from "@/lib/repositories";
import { providerQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = providerQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({ providers: listProviders(parsed.data) });
}
