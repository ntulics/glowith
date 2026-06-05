import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD, AGENT_PASSWORD } from "@/lib/demo";

// Unsplash images per category
const PORTFOLIO_IMAGES: Record<string, string[]> = {
  Hair: [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80",
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&q=80",
    "https://images.unsplash.com/photo-1560869713-7d0b29430803?w=900&q=80",
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=900&q=80"
  ],
  Makeup: [
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80",
    "https://images.unsplash.com/photo-1619451683970-4afba15ea614?w=900&q=80",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80",
    "https://images.unsplash.com/photo-1633681122049-8e7ead5da9f6?w=900&q=80"
  ],
  Nails: [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80",
    "https://images.unsplash.com/photo-1604655852743-f4b04efde9ff?w=900&q=80",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80"
  ],
  Barber: [
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900&q=80",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&q=80"
  ],
  Spa: [
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=900&q=80",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&q=80",
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=900&q=80"
  ]
};

const SERVICES_BY_CATEGORY: Record<string, Array<{ name: string; durationMinutes: number; priceCents: number; depositCents: number }>> = {
  Hair: [
    { name: "Silk press & blowout", durationMinutes: 90, priceCents: 85000, depositCents: 25000 },
    { name: "Full colour & toner", durationMinutes: 150, priceCents: 145000, depositCents: 40000 },
    { name: "Knotless braids (medium)", durationMinutes: 240, priceCents: 130000, depositCents: 35000 },
    { name: "Full weave install", durationMinutes: 180, priceCents: 155000, depositCents: 45000 },
    { name: "Trim & blow-dry", durationMinutes: 45, priceCents: 45000, depositCents: 12000 }
  ],
  Makeup: [
    { name: "Soft glam", durationMinutes: 60, priceCents: 70000, depositCents: 20000 },
    { name: "Bridal full glam", durationMinutes: 90, priceCents: 120000, depositCents: 35000 },
    { name: "Matric farewell look", durationMinutes: 75, priceCents: 65000, depositCents: 18000 },
    { name: "Airbrush foundation", durationMinutes: 45, priceCents: 50000, depositCents: 15000 }
  ],
  Nails: [
    { name: "Structured gel full set", durationMinutes: 75, priceCents: 55000, depositCents: 15000 },
    { name: "Builder gel & nail art", durationMinutes: 90, priceCents: 65000, depositCents: 18000 },
    { name: "Acrylic full set", durationMinutes: 90, priceCents: 60000, depositCents: 16000 },
    { name: "Gel infill (2 weeks)", durationMinutes: 60, priceCents: 38000, depositCents: 10000 },
    { name: "Nail art (per nail)", durationMinutes: 15, priceCents: 4000, depositCents: 1000 }
  ],
  Barber: [
    { name: "Skin fade", durationMinutes: 45, priceCents: 22000, depositCents: 5000 },
    { name: "Taper fade + line-up", durationMinutes: 50, priceCents: 25000, depositCents: 6000 },
    { name: "Beard shape & sculpt", durationMinutes: 30, priceCents: 18000, depositCents: 5000 },
    { name: "Cut + beard combo", durationMinutes: 70, priceCents: 35000, depositCents: 9000 }
  ],
  Spa: [
    { name: "Swedish massage (60 min)", durationMinutes: 60, priceCents: 95000, depositCents: 25000 },
    { name: "Deep tissue (90 min)", durationMinutes: 90, priceCents: 135000, depositCents: 35000 },
    { name: "Hydrating facial", durationMinutes: 75, priceCents: 90000, depositCents: 22000 },
    { name: "Foot reflexology", durationMinutes: 45, priceCents: 58000, depositCents: 15000 }
  ]
};

const PORTFOLIO_BY_CATEGORY: Record<string, Array<{ caption: string; tags: string[] }>> = {
  Hair: [
    { caption: "Silk press — glass-smooth finish", tags: ["silkpress", "hair"] },
    { caption: "Copper gloss colour refresh", tags: ["colour", "gloss"] },
    { caption: "Protective knotless braids", tags: ["braids", "protective"] },
    { caption: "Bridal prep silk blowout", tags: ["bridal", "blowout"] }
  ],
  Makeup: [
    { caption: "Champagne soft glam", tags: ["softglam", "glam"] },
    { caption: "Smokey eye bridal look", tags: ["bridal", "smokey"] },
    { caption: "Editorial bold liner", tags: ["editorial", "liner"] },
    { caption: "Matric farewell glam", tags: ["matric", "glam"] }
  ],
  Nails: [
    { caption: "Chrome almond gel set", tags: ["chrome", "gel"] },
    { caption: "Nude builder gel", tags: ["builder", "nude"] },
    { caption: "Micro floral nail art", tags: ["art", "floral"] },
    { caption: "Pastel ombre acrylic", tags: ["ombre", "acrylic"] }
  ],
  Barber: [
    { caption: "Clean skin fade", tags: ["fade", "skin"] },
    { caption: "Taper + design", tags: ["taper", "design"] },
    { caption: "Beard sculpt & line", tags: ["beard", "lineup"] },
    { caption: "Afro round shape-up", tags: ["afro", "shape"] }
  ],
  Spa: [
    { caption: "Relaxation suite setup", tags: ["spa", "relax"] },
    { caption: "Hot stone therapy", tags: ["hotstone", "massage"] },
    { caption: "Hydrating facial treatment", tags: ["facial", "glow"] },
    { caption: "Couples retreat package", tags: ["couples", "wellness"] }
  ]
};

async function seedServicesAndPortfolio(profileId: string, category: string) {
  const svcs = SERVICES_BY_CATEGORY[category] ?? SERVICES_BY_CATEGORY.Hair;
  const imgs = PORTFOLIO_IMAGES[category] ?? PORTFOLIO_IMAGES.Hair;
  const posts = PORTFOLIO_BY_CATEGORY[category] ?? PORTFOLIO_BY_CATEGORY.Hair;

  await prisma.service.createMany({
    data: svcs.map((s) => ({ ...s, providerProfileId: profileId, category, active: true })),
    skipDuplicates: true
  });

  for (let i = 0; i < posts.length; i++) {
    const existing = await prisma.portfolioPost.count({ where: { providerProfileId: profileId } });
    if (existing >= posts.length) break;
    await prisma.portfolioPost.create({
      data: {
        providerProfileId: profileId,
        imageUrl: imgs[i % imgs.length],
        caption: posts[i].caption,
        tags: posts[i].tags,
        likes: Math.floor(Math.random() * 400) + 50,
        saves: Math.floor(Math.random() * 120) + 10
      }
    });
  }
}

const DEMO_TENANTS = [
  {
    handle: "@glowith_demo",
    businessName: "Glowith Demo Salon",
    category: "Hair",
    city: "Rosebank, Johannesburg",
    lat: -26.1467, lng: 28.0426,
    bio: "Demo salon for testing the full Glowith booking experience.",
    owner: { name: "Demo Owner", email: "demo@glowith.co.za" },
    agents: [
      { name: "Naledi Demo", email: "naledi.demo@glowith.co.za", category: "Hair", bio: "Demo hair stylist — silk press, colour, braids." },
      { name: "Zara Demo", email: "zara.demo@glowith.co.za", category: "Makeup", bio: "Demo makeup artist — soft glam, bridal, matric." },
      { name: "Boitumelo Demo", email: "boitumelo.demo@glowith.co.za", category: "Nails", bio: "Demo nail tech — gel, acrylic, nail art." }
    ]
  },
  {
    handle: "@duvha_demo",
    businessName: "Duvha Park Demo Studio",
    category: "Nails",
    city: "Duvha Park, eMalahleni",
    lat: -25.8833, lng: 29.2333,
    bio: "Demo studio for testing in the eMalahleni area.",
    owner: { name: "Demo Duvha Owner", email: "demo.duvha@glowith.co.za" },
    agents: [
      { name: "Precious Demo", email: "precious.demo@glowith.co.za", category: "Hair", bio: "Demo hair stylist — relaxer, braids, weaves." },
      { name: "Sihle Demo", email: "sihle.demo@glowith.co.za", category: "Nails", bio: "Demo nail tech — builder gel, nail art." },
      { name: "Tebogo Demo", email: "tebogo.demo@glowith.co.za", category: "Barber", bio: "Demo barber — fades, line-ups, beard." }
    ]
  }
];

export async function POST() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const created: Array<{ tenant: string; owner: string; password: string; agents: Array<{ name: string; email: string; password: string }> }> = [];

  for (const tenant of DEMO_TENANTS) {
    let businessProfile = await prisma.providerProfile.findUnique({ where: { handle: tenant.handle } });

    if (!businessProfile) {
      const ownerHash = await bcrypt.hash(DEMO_PASSWORD, 12);
      const ownerUser = await prisma.user.create({
        data: {
          name: tenant.owner.name,
          email: tenant.owner.email,
          passwordHash: ownerHash,
          role: "PROVIDER",
          providerProfile: {
            create: {
              handle: tenant.handle,
              businessName: tenant.businessName,
              category: tenant.category,
              bio: tenant.bio,
              city: tenant.city,
              latitude: tenant.lat, longitude: tenant.lng,
              providerType: "BUSINESS",
              isDemo: true, verified: true
            }
          }
        },
        include: { providerProfile: true }
      });
      businessProfile = ownerUser.providerProfile!;
    }

    // Seed services + portfolio for the business itself
    await seedServicesAndPortfolio(businessProfile.id, tenant.category);

    const agentHash = await bcrypt.hash(AGENT_PASSWORD, 12);
    const agentResults: Array<{ name: string; email: string; password: string }> = [];

    for (const agent of tenant.agents) {
      let agentUser = await prisma.user.findUnique({
        where: { email: agent.email },
        include: { providerProfile: true }
      });

      if (!agentUser) {
        agentUser = await prisma.user.create({
          data: {
            name: agent.name,
            email: agent.email,
            passwordHash: agentHash,
            role: "PROVIDER",
            providerProfile: {
              create: {
                handle: `@${agent.email.split("@")[0].replace(/[^a-z0-9]/g, "")}`,
                businessName: agent.name,
                category: agent.category,
                bio: agent.bio,
                city: tenant.city,
                latitude: tenant.lat, longitude: tenant.lng,
                providerType: "FREELANCER",
                parentBusinessId: businessProfile!.id,
                isDemo: true, verified: true
              }
            }
          },
          include: { providerProfile: true }
        });
      }

      if (agentUser.providerProfile) {
        await seedServicesAndPortfolio(agentUser.providerProfile.id, agent.category);
      }

      agentResults.push({ name: agent.name, email: agent.email, password: AGENT_PASSWORD });
    }

    created.push({
      tenant: tenant.businessName,
      owner: tenant.owner.email,
      password: DEMO_PASSWORD,
      agents: agentResults
    });
  }

  // ── Demo client accounts ──────────────────────────────────────────────────
  const DEMO_CLIENTS = [
    { name: "Amahle Dube", email: "amahle.demo@glowith.co.za" },
    { name: "Lesedi Khumalo", email: "lesedi.demo@glowith.co.za" },
    { name: "Refilwe Mokoena", email: "refilwe.demo@glowith.co.za" },
    { name: "Thabo Sithole", email: "thabo.demo@glowith.co.za" }
  ];
  const clientHash = await bcrypt.hash(AGENT_PASSWORD, 12);
  const clientIds: string[] = [];
  for (const c of DEMO_CLIENTS) {
    let cu = await prisma.user.findUnique({ where: { email: c.email }, select: { id: true } });
    if (!cu) cu = await prisma.user.create({ data: { name: c.name, email: c.email, passwordHash: clientHash, role: "CLIENT" }, select: { id: true } });
    clientIds.push(cu.id);
  }

  // ── Dummy appointments ────────────────────────────────────────────────────
  const now = Date.now();
  const day = 86400000;
  const STATUSES = ["COMPLETED", "COMPLETED", "CONFIRMED", "CONFIRMED", "PENDING_DEPOSIT", "CANCELLED"] as const;

  const allProfiles = await prisma.providerProfile.findMany({
    where: { isDemo: true },
    include: { services: { where: { active: true }, take: 3 } }
  });

  for (const profile of allProfiles) {
    if (!profile.services.length) continue;
    const existingCount = await prisma.booking.count({ where: { providerProfileId: profile.id } });
    if (existingCount >= 6) continue;

    for (let i = 0; i < 6; i++) {
      const service = profile.services[i % profile.services.length];
      const clientId = clientIds[i % clientIds.length];
      const offsetDays = i < 3 ? -(i + 1) * 5 : (i - 2) * 4; // past then future
      const startsAt = new Date(now + offsetDays * day);
      startsAt.setHours(9 + i * 1, 0, 0, 0);
      const status = STATUSES[i];

      await prisma.booking.create({
        data: {
          clientId,
          providerProfileId: profile.id,
          serviceId: service.id,
          startsAt,
          depositCents: service.depositCents,
          status,
          notes: i === 0 ? "First-time client, please confirm parking availability." : undefined
        }
      });
    }
  }

  // ── Seed restricted names (platform-reserved slugs) ──────────────────────
  for (const reserved of ["freelancer", "freelancers", "admin", "glowith", "support", "api", "www", "app", "dashboard"]) {
    await prisma.restrictedName.upsert({
      where: { name: reserved },
      update: {},
      create: { name: reserved, reason: "Platform reserved" }
    });
  }

  // ── Sample blog post (showcases all editor features) ─────────────────────
  const SAMPLE_BLOG = `Welcome to **Glowith** — South Africa's social beauty marketplace. This sample post shows everything the blog supports, from headings to drop caps, so you can see how your stories will look. Notice the large drop cap on this very first paragraph.

## Why we built Glowith

Finding a great beauty professional shouldn't mean endless DMs and guesswork. Glowith brings salons, studios and independent freelancers into one place — with real portfolios, honest reviews and instant booking.

> "Beauty is power; a smile is its sword." — and a good booking experience is the scabbard.

### What you can do here

- Discover top-rated pros **near you** with live distances on the map
- Browse portfolios and *real* reviews before you book
- Book multiple services in one go and pay a secure deposit

### Getting the most from your profile

1. Add a clear, well-lit **cover photo**
2. Write a short, friendly bio
3. Upload at least 6 portfolio images
4. Keep your services and prices up to date

![A bright, modern nail studio](https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80)

## Formatting you can use

You can add \`inline code\`, [links to other pages](/about), **bold** and *italic* text, lists, quotes, images and horizontal rules.

---

Ready to glow? [List your business](/business) or [discover beauty near you](/). We can't wait to see what you create.`;

  await prisma.blogPost.upsert({
    where: { slug: "welcome-to-glowith" },
    update: {},
    create: {
      slug: "welcome-to-glowith",
      title: "Welcome to Glowith — your beauty, beautifully booked",
      excerpt: "A quick tour of everything the Glowith blog can do — headings, drop caps, images, quotes and more.",
      coverImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80",
      content: SAMPLE_BLOG,
      published: true,
      publishedAt: new Date(),
      authorName: "The Glowith Team"
    }
  });

  return NextResponse.json({ ok: true, credentials: created });
}
