import { NextResponse } from "next/server";

// Forward geocode a typed place name → { lat, lng }. Azure Maps first, Nominatim fallback.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const key = process.env.AZURE_MAPS_KEY;
  if (key) {
    try {
      const url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${key}&query=${encodeURIComponent(q)}&countrySet=ZA&limit=1&language=en-US`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const pos = data?.results?.[0]?.position;
        if (pos) return NextResponse.json({ lat: pos.lat, lng: pos.lon, source: "azure" });
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=za`,
      { headers: { "Accept-Language": "en", "User-Agent": "Glowith/1.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data[0]) return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), source: "nominatim" });
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ lat: null, lng: null });
}
