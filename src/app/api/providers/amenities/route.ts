import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_AMENITY_KEYS } from "@/lib/amenities";

// GET /api/providers/amenities — returns { amenities: { key, value }[] } for the
// logged-in provider.
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findFirst({
    where: { userId: user.id },
    select: { id: true }
  });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const amenities = await prisma.providerAmenity.findMany({
    where: { providerProfileId: profile.id },
    select: { amenityKey: true, value: true }
  });

  return NextResponse.json({ amenities: amenities.map((a) => ({ key: a.amenityKey, value: a.value })) });
}

// PUT /api/providers/amenities — replaces all amenities for the provider.
// Body: { amenities: Array<{ key: string; value?: string | null }> }
export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.providerProfile.findFirst({
    where: { userId: user.id },
    select: { id: true }
  });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const body = await request.json();
  const incoming: Array<{ key: string; value?: string | null }> = body.amenities ?? [];

  // Validate keys
  const valid = incoming.filter((a) => ALL_AMENITY_KEYS.has(a.key));

  // Replace atomically: delete existing, insert new
  await prisma.$transaction([
    prisma.providerAmenity.deleteMany({ where: { providerProfileId: profile.id } }),
    prisma.providerAmenity.createMany({
      data: valid.map((a) => ({
        providerProfileId: profile.id,
        amenityKey: a.key,
        value: a.value ?? null
      }))
    })
  ]);

  return NextResponse.json({ ok: true, count: valid.length });
}
