import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD = "GlowithDemo2026!";
const AGENT_PASSWORD = "Demo1234!";

const DEMO_TENANTS = [
  {
    handle: "@glowith_demo",
    businessName: "Glowith Demo Salon",
    category: "Hair",
    city: "Rosebank, Johannesburg",
    bio: "Demo salon for testing the full Glowith booking experience.",
    owner: { name: "Demo Owner", email: "demo@glowith.co.za" },
    agents: [
      { name: "Naledi Demo", email: "naledi.demo@glowith.co.za", category: "Hair", bio: "Demo hair stylist" },
      { name: "Zara Demo", email: "zara.demo@glowith.co.za", category: "Makeup", bio: "Demo makeup artist" },
      { name: "Boitumelo Demo", email: "boitumelo.demo@glowith.co.za", category: "Nails", bio: "Demo nail tech" }
    ]
  },
  {
    handle: "@duvha_demo",
    businessName: "Duvha Park Demo Studio",
    category: "Nails",
    city: "Duvha Park, eMalahleni",
    bio: "Demo studio for testing in the eMalahleni area.",
    owner: { name: "Demo Duvha Owner", email: "demo.duvha@glowith.co.za" },
    agents: [
      { name: "Precious Demo", email: "precious.demo@glowith.co.za", category: "Hair", bio: "Demo hair stylist" },
      { name: "Sihle Demo", email: "sihle.demo@glowith.co.za", category: "Nails", bio: "Demo nail tech" },
      { name: "Tebogo Demo", email: "tebogo.demo@glowith.co.za", category: "Barber", bio: "Demo barber" }
    ]
  }
];

export async function POST() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const created: Array<{ tenant: string; owner: string; password: string; agents: Array<{ email: string; password: string }> }> = [];

  for (const tenant of DEMO_TENANTS) {
    // Check if already exists
    const existing = await prisma.providerProfile.findUnique({ where: { handle: tenant.handle } });
    if (existing) {
      created.push({ tenant: tenant.businessName, owner: tenant.owner.email, password: DEMO_PASSWORD, agents: tenant.agents.map(a => ({ email: a.email, password: AGENT_PASSWORD })) });
      continue;
    }

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
            latitude: 0,
            longitude: 0,
            providerType: "BUSINESS",
            isDemo: true,
            verified: true
          }
        }
      },
      include: { providerProfile: true }
    });

    const businessId = ownerUser.providerProfile!.id;
    const agentHash = await bcrypt.hash(AGENT_PASSWORD, 12);

    for (const agent of tenant.agents) {
      const existingAgent = await prisma.user.findUnique({ where: { email: agent.email } });
      if (existingAgent) continue;
      await prisma.user.create({
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
              latitude: 0,
              longitude: 0,
              providerType: "FREELANCER",
              parentBusinessId: businessId,
              isDemo: true,
              verified: true
            }
          }
        }
      });
    }

    created.push({ tenant: tenant.businessName, owner: tenant.owner.email, password: DEMO_PASSWORD, agents: tenant.agents.map(a => ({ email: a.email, password: AGENT_PASSWORD })) });
  }

  return NextResponse.json({ ok: true, credentials: created });
}
