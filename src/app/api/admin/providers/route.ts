import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, email, password, businessName, handle, category, city, bio, isDemo } = body;

  if (!name || !email || !password || !businessName || !handle || !category || !city) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const existingHandle = await prisma.providerProfile.findUnique({ where: { handle } });
  if (existingHandle) return NextResponse.json({ error: "Handle already taken" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "PROVIDER",
      providerProfile: {
        create: {
          handle,
          businessName,
          category,
          city,
          bio: bio ?? "",
          latitude: 0,
          longitude: 0,
          isDemo: isDemo ?? false
        }
      }
    },
    include: {
      providerProfile: {
        include: { _count: { select: { bookings: true, services: true, posts: true } } }
      }
    }
  });

  const p = newUser.providerProfile!;
  return NextResponse.json({
    provider: {
      id: p.id,
      businessName: p.businessName,
      handle: p.handle,
      category: p.category,
      city: p.city,
      verified: p.verified,
      isDemo: p.isDemo,
      email: newUser.email,
      bookings: p._count.bookings,
      services: p._count.services,
      posts: p._count.posts,
      createdAt: p.createdAt.toISOString()
    }
  }, { status: 201 });
}
