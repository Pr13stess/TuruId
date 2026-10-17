export interface PublicReview {
  id: string; rating: number; review_text: string | null; created_at: string;
}
export function propertyShareText(property: { name: string; address: string; latitude: number | null; longitude: number | null }) {
  const { latitude: lat, longitude: lon } = property;
  const validLocation = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return [`${property.name} — TuruId`, property.address,
    ...(validLocation ? [`Lokasi: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`] : [])].join('\n');
}
