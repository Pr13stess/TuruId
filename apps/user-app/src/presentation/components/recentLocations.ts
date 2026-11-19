import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReferenceLocation } from "../../domain/models";

const STORAGE_KEY = "turuid:recent-reference-locations:v1";
const LIMIT = 5;
let cached: ReferenceLocation[] = [];
let loaded: Promise<ReferenceLocation[]> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

export function locationKey(point: ReferenceLocation) {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
}

function isLocation(value: unknown): value is ReferenceLocation {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<ReferenceLocation>;
  return typeof point.label === "string" && point.label.trim().length > 0
    && typeof point.latitude === "number" && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && typeof point.longitude === "number" && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

function unique(points: ReferenceLocation[]) {
  return points.filter((point, index) => points.findIndex((other) => locationKey(other) === locationKey(point)) === index).slice(0, LIMIT);
}

export function loadRecentLocations(): Promise<ReferenceLocation[]> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? unique(parsed.filter(isLocation)) : [];
    return cached;
  }).catch(() => cached);
  return loaded.then(() => [...cached]);
}

export async function rememberLocation(point: ReferenceLocation): Promise<void> {
  await loadRecentLocations();
  if (!isLocation(point)) return;
  cached = unique([point, ...cached]);
  const snapshot = JSON.stringify(cached);
  // Serialize writes so a slower earlier write cannot replace the newest choice.
  // Keep the session history usable when device storage is unavailable.
  writeQueue = writeQueue.then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot)).catch(() => {});
  await writeQueue;
}
