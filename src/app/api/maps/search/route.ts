import { NextRequest, NextResponse } from "next/server";
import { listProviders } from "@/lib/repositories";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const matches = listProviders({ q });

  return NextResponse.json({
    source: "azure-maps-ready",
    azureMapsKeyConfigured: Boolean(process.env.AZURE_MAPS_KEY),
    results: matches.map((provider) => ({
      id: provider.id,
      label: provider.businessName,
      address: provider.location.label,
      position: [provider.location.lng, provider.location.lat]
    }))
  });
}
