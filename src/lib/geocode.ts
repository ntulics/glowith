// Server-side forward geocoding (Azure Maps → Nominatim fallback) with a
// module-level cache so repeated city lookups are cheap.
const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeQuery(q: string): Promise<{ lat: number; lng: number } | null> {
  const key = q.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  let result: { lat: number; lng: number } | null = null;
  const azureKey = process.env.AZURE_MAPS_KEY;

  if (azureKey) {
    try {
      const url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureKey}&query=${encodeURIComponent(q)}&countrySet=ZA&limit=1&language=en-US`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const pos = data?.results?.[0]?.position;
        if (pos) result = { lat: pos.lat, lng: pos.lon };
      }
    } catch { /* fall through */ }
  }

  if (!result) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=za`,
        { headers: { "Accept-Language": "en", "User-Agent": "Glowith/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data[0]) result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch { /* ignore */ }
  }

  cache.set(key, result);
  return result;
}
