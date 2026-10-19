import { mapPoint, type MapPoint } from "./propertyLocation";

export interface LocationDevice {
  permission(): Promise<boolean>;
  enabled(): Promise<boolean>;
  position(): Promise<unknown>;
}

export async function currentLocation(device: LocationDevice, timeoutMs = 20000): Promise<MapPoint> {
  if (!(await device.permission()))
    throw new Error("Izin lokasi ditolak. Aktifkan izin di pengaturan atau pilih titik secara manual.");
  if (!(await device.enabled()))
    throw new Error("Lokasi perangkat belum aktif. Nyalakan GPS lalu coba lagi.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      device.position(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Lokasi belum ditemukan. Coba di tempat terbuka atau pilih titik secara manual.")), timeoutMs);
      }),
    ]);
    const point = mapPoint(result);
    if (!point) throw new Error("Koordinat perangkat tidak valid. Pilih titik secara manual.");
    return point;
  } finally {
    clearTimeout(timer);
  }
}
