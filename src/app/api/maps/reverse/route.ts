import { NextResponse } from "next/server";

const isWardOrNumeric = (v: unknown): boolean =>
  typeof v !== "string" || /\bward\s*\d+/i.test(v) || /^\d/.test(v);

function combine(suburb?: string, city?: string): string | null {
  const s = isWardOrNumeric(suburb) ? undefined : suburb;
  const c = isWardOrNumeric(city) ? undefined : city;
  if (s && c && s !== c) return `${s}, ${c}`;
  return s ?? c ?? null;
}

// Reverse geocode lat/lng → "Suburb, City". Uses Azure Maps (suburb-level
// municipalitySubdivision) when AZURE_MAPS_KEY is set, falling back to Nominatim.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  const key = process.env.AZURE_MAPS_KEY;
  if (key) {
    try {
      const url = `https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0&subscription-key=${key}&query=${lat},${lng}&language=en-US`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const addr = data?.addresses?.[0]?.address ?? {};
        // Azure: municipalitySubdivision ≈ suburb/neighbourhood, municipality ≈ city/town
        const area = combine(addr.municipalitySubdivision || addr.neighbourhood, addr.municipality || addr.countrySecondarySubdivision);
        if (area) return NextResponse.json({ area, source: "azure" });
      }
    } catch {
      /* fall through to Nominatim */
    }
  }

  // Fallback: Nominatim (OpenStreetMap)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "Glowith/1.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const a = data.address ?? {};
      const pick = (...vals: unknown[]) => vals.find((v) => !isWardOrNumeric(v)) as string | undefined;
      const suburb = pick(a.suburb, a.neighbourhood, a.quarter, a.hamlet, a.city_district, a.residential);
      const city = pick(a.city, a.town, a.village, a.municipality, a.county);
      const area = combine(suburb, city);
      if (area) return NextResponse.json({ area, source: "nominatim" });
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ area: null });
}
