import { NextRequest, NextResponse } from "next/server";
import { providers } from "@/domain/seed";

function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function azureRouteDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }, key: string) {
  const url = new URL("https://atlas.microsoft.com/route/directions/json");
  url.searchParams.set("api-version", "1.0");
  url.searchParams.set("subscription-key", key);
  url.searchParams.set("query", `${from.lat},${from.lng}:${to.lat},${to.lng}`);
  url.searchParams.set("traffic", "true");

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Azure Maps returned ${response.status}`);
  const data = await response.json();
  const meters = data?.routes?.[0]?.summary?.lengthInMeters;
  if (typeof meters !== "number") throw new Error("Azure Maps route distance missing");
  return meters / 1000;
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const origin = { lat, lng };
  const key = process.env.AZURE_MAPS_KEY;
  const distances: Array<{ id: string; distanceKm: number; source: "azure-maps" | "haversine" }> = [];

  for (const provider of providers) {
    const destination = { lat: provider.location.lat, lng: provider.location.lng };
    if (key) {
      try {
        distances.push({
          id: provider.id,
          distanceKm: Number((await azureRouteDistanceKm(origin, destination, key)).toFixed(1)),
          source: "azure-maps"
        });
        continue;
      } catch (error) {
        console.warn("[maps/distance] Azure Maps distance failed, falling back:", error);
      }
    }

    distances.push({
      id: provider.id,
      distanceKm: Number(haversineKm(origin, destination).toFixed(1)),
      source: "haversine"
    });
  }

  return NextResponse.json({
    azureMapsKeyConfigured: Boolean(key),
    origin,
    distances
  });
}
