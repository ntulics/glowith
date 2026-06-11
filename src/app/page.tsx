import { headers } from "next/headers";
import { MarketplaceApp } from "@/components/marketplace/marketplace-app";

export default async function Home() {
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? undefined;
  return <MarketplaceApp tenantSlug={tenantSlug} />;
}
