// OpenStreetMap geocoding (Nominatim) + OSRM routing helpers.
// Free public endpoints — for production, host your own or use a paid provider.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function forwardGeocode(q: string): Promise<GeocodeResult | null> {
  if (!q.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=my`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const data = await r.json();
  return data?.display_name ?? null;
}

export interface RouteResult {
  geometry: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceMeters: number;
  durationSeconds: number;
}

export async function getOsrmRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const route = data?.routes?.[0];
  if (!route) return null;
  // OSRM returns [lng, lat] — flip for Leaflet [lat, lng]
  const geometry: [number, number][] = (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]);
  return { geometry, distanceMeters: route.distance, durationSeconds: route.duration };
}
