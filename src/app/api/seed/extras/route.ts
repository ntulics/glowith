import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin-only: seeds sample ServiceExtras onto every active service in the DB
// so the booking flow's "optional extras" step has demo data.
// POST /api/seed/extras  — idempotent (skips services that already have extras)
export async function POST() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const services = await prisma.service.findMany({
    where: { active: true, extras: { none: {} } },
    select: { id: true, category: true, name: true }
  });

  if (services.length === 0) return NextResponse.json({ seeded: 0, message: "No new services to seed" });

  const EXTRAS_BY_CATEGORY: Record<string, Array<{ name: string; description: string; priceCents: number; durationMinutes: number }>> = {
    Hair: [
      { name: "Deep conditioning treatment", description: "Intense moisture & repair mask", priceCents: 15000, durationMinutes: 20 },
      { name: "Scalp oil treatment", description: "Nourishing scalp massage with essential oils", priceCents: 10000, durationMinutes: 10 },
      { name: "Blow dry & style", description: "Professional blow dry finish", priceCents: 20000, durationMinutes: 20 }
    ],
    Nails: [
      { name: "Nail art (per nail)", description: "Hand-painted design on any nail", priceCents: 5000, durationMinutes: 5 },
      { name: "Gel top coat", description: "Long-lasting gel seal over any polish", priceCents: 8000, durationMinutes: 10 },
      { name: "Paraffin wax treatment", description: "Softening paraffin dip for hands or feet", priceCents: 12000, durationMinutes: 15 }
    ],
    Makeup: [
      { name: "Strip lashes application", description: "Glam lash application included", priceCents: 10000, durationMinutes: 10 },
      { name: "Skin prep & primer", description: "Full prep for long-wear results", priceCents: 8000, durationMinutes: 10 },
      { name: "Touch-up kit", description: "Mini kit to keep throughout the day", priceCents: 7500, durationMinutes: 0 }
    ],
    Braiding: [
      { name: "Knotless upgrade", description: "Lighter, knotless start at roots", priceCents: 20000, durationMinutes: 30 },
      { name: "Color highlights", description: "Add colored extensions of your choice", priceCents: 25000, durationMinutes: 20 },
      { name: "Scalp treatment spray", description: "Post-braid soothing spray", priceCents: 5000, durationMinutes: 5 }
    ],
    Lashes: [
      { name: "Lash lift add-on", description: "Lift & curl natural lashes before extensions", priceCents: 18000, durationMinutes: 20 },
      { name: "Tinting", description: "Tint natural lashes for a fuller look", priceCents: 10000, durationMinutes: 15 },
      { name: "Volume boost", description: "Extra fans for maximum fullness", priceCents: 15000, durationMinutes: 15 }
    ],
    default: [
      { name: "Premium products upgrade", description: "Upgrade to luxury product range", priceCents: 10000, durationMinutes: 0 },
      { name: "Express service", description: "Priority scheduling + faster service time", priceCents: 15000, durationMinutes: -10 },
      { name: "Relaxation add-on", description: "Additional pampering during your appointment", priceCents: 8000, durationMinutes: 15 }
    ]
  };

  let seeded = 0;
  for (const svc of services) {
    // Match category to extras list (case-insensitive prefix match)
    const cat = Object.keys(EXTRAS_BY_CATEGORY).find(
      (k) => k !== "default" && svc.category?.toLowerCase().includes(k.toLowerCase())
    );
    const extrasToAdd = EXTRAS_BY_CATEGORY[cat ?? "default"];

    await prisma.serviceExtra.createMany({
      data: extrasToAdd.map((e) => ({ serviceId: svc.id, ...e, active: true }))
    });
    seeded++;
  }

  return NextResponse.json({ seeded, message: `Seeded extras for ${seeded} services` });
}
