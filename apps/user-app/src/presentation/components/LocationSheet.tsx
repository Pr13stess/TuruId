import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import type { ReferenceLocation } from "../../domain/models";
import { Sheet } from "./Sheet";
import { Button, Chip } from "./Primitives";
import { MapPickerModal } from "./MapPickerModal";
import { loadRecentLocations, locationKey, rememberLocation } from "./recentLocations";
import {
  describeCoordinates,
  getCurrentCoordinates,
} from "../../data/device/DeviceLocation";
const places: ReferenceLocation[] = [
  { label: "UGM · Sleman", latitude: -7.7714, longitude: 110.3775 },
  {
    label: "Stasiun Tugu · Yogyakarta",
    latitude: -7.7894,
    longitude: 110.3632,
  },
  { label: "Gedung Sate · Bandung", latitude: -6.9025, longitude: 107.6188 },
  { label: "UNDIP · Semarang", latitude: -7.0518, longitude: 110.4406 },
];
export function LocationSheet({
  current,
  onClose,
  onSelect,
}: {
  current: ReferenceLocation | null;
  onClose: () => void;
  onSelect: (p: ReferenceLocation | null) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mapOpen, setMapOpen] = useState(false);
  const [recent, setRecent] = useState<ReferenceLocation[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const afterClose = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!closing) return;
    // Keep mounted until the 200ms NativeWind exit keyframe has finished.
    const timer = setTimeout(() => {
      const action = afterClose.current;
      afterClose.current = null;
      setClosing(false);
      action?.();
    }, 220);
    return () => clearTimeout(timer);
  }, [closing]);
  function closeThen(action: () => void) {
    if (!mounted.current || afterClose.current) return;
    afterClose.current = action;
    setClosing(true);
  }
  useEffect(() => {
    let active = true;
    void loadRecentLocations().then((points) => {
      if (active) {
        setRecent(points);
        setRecentLoading(false);
      }
    });
    return () => { active = false; };
  }, []);
  function select(point: ReferenceLocation | null) {
    if (!mounted.current || afterClose.current) return;
    if (point) void rememberLocation(point);
    if (mapOpen) onSelect(point);
    else closeThen(() => onSelect(point));
  }
  async function useMyLocation() {
    setError("");
    setBusy(true);
    try {
      const point = await getCurrentCoordinates();
      const label = await describeCoordinates(point, "Lokasi saya");
      select({ label, ...point });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lokasi belum bisa diambil.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Sheet
        visible={!mapOpen}
        title="Lokasi acuan"
        onClose={() => closeThen(onClose)}
        animationType="none"
        panelClassName={closing ? "animate-location-sheet-out" : "animate-location-sheet-in"}
        interactive={!closing}
      >
        <Text className="text-label leading-muted text-muted">
          Pilih titik acuan untuk menghitung jarak (garis lurus) ke kos.
        </Text>
        <Button
          title={busy ? "Mencari lokasimu…" : "Gunakan lokasi saya"}
          disabled={busy}
          onPress={useMyLocation}
        />
        <Button
          secondary
          title="Pilih di peta"
          onPress={() => closeThen(() => setMapOpen(true))}
        />
        {!!error && <Text className="text-label leading-muted text-danger">{error}</Text>}
        <Text className="text-label font-semibold text-primary">Terakhir dipilih</Text>
        {recentLoading ? (
          <Text className="text-label leading-muted text-muted">Memuat lokasi terakhir…</Text>
        ) : recent.length ? recent.map((point) => (
          <Chip
            key={locationKey(point)}
            label={point.label}
            selected={!!current && locationKey(current) === locationKey(point)}
            onPress={() => select(point)}
          />
        )) : (
          <Text className="text-label leading-muted text-muted">Belum ada lokasi yang dipilih.</Text>
        )}
        <Text className="text-label leading-muted text-muted">Atau pilih titik populer</Text>
        {places.map((p) => (
          <Chip key={p.label} label={p.label} onPress={() => select(p)} />
        ))}
        <Button
          secondary
          title="Hapus lokasi acuan"
          onPress={() => select(null)}
        />
      </Sheet>
      {mapOpen && (
        <MapPickerModal
          initial={current}
          onClose={() => setMapOpen(false)}
          onConfirm={select}
        />
      )}
    </>
  );
}
