// Fixed passwords used when seeding demo accounts. Centralised so the admin
// Providers page can always display working demo credentials.
export const DEMO_PASSWORD = "GlowithDemo2026!"; // business / freelancer demo owners
export const AGENT_PASSWORD = "Demo1234!";       // demo agents

// The password for a demo account depends on whether it's an agent.
export function demoPasswordFor(parentBusinessId: string | null): string {
  return parentBusinessId ? AGENT_PASSWORD : DEMO_PASSWORD;
}
