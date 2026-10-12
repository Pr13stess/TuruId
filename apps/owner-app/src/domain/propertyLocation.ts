export type MapPoint = { latitude: number; longitude: number };
export function mapPoint(value: unknown): MapPoint | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<MapPoint>;
  return typeof p.latitude === "number" && typeof p.longitude === "number" &&
    Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180
    ? { latitude: p.latitude, longitude: p.longitude } : null;
}
export type MapState = { point: MapPoint | null; ready: boolean; moving: boolean; error: string };
export const initialMapState = (point: MapPoint | null): MapState => ({ point: mapPoint(point), ready: false, moving: false, error: "" });
export function receiveMapEvent(state: MapState, raw: string): MapState {
  try {
    const event = JSON.parse(raw);
    if (event?.type === "ready") return { ...state, ready: true, error: "" };
    if (event?.type === "moving") return { ...state, moving: true };
    if (event?.type === "error") return { ...state, ready: false, error: "Peta belum bisa dimuat. Periksa koneksi lalu coba lagi." };
    if (event?.type === "point") {
      const point = mapPoint(event);
      if (point) return { ...state, point, moving: false };
    }
  } catch { /* Ignore malformed/untrusted WebView messages. */ }
  return state;
}
export const canConfirmLocation = (state: MapState) => state.ready && !state.moving && !state.error && !!state.point;
