import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { canConfirmLocation, initialMapState, receiveMapEvent, type MapPoint } from "../../domain/propertyLocation";
import { propertyMapHtml } from "./propertyMapHtml";
import { PropertyMapSurface } from "./PropertyMapSurface";
import { Button } from "./UI";
import { Text } from "./Typography";
import { currentPropertyLocation } from "../currentPropertyLocation";

export function PropertyLocationPicker({ initial, onClose, onConfirm }: {
  initial: MapPoint | null; onClose: () => void; onConfirm: (point: MapPoint) => void;
}) {
  const [state, setState] = useState(() => initialMapState(initial));
  const [html, setHtml] = useState(() => propertyMapHtml(initial));
  const [attempt, setAttempt] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const locate = async () => {
    if (pending.current) return;
    pending.current = true;
    setLocating(true);
    setLocationError("");
    try {
      const point = await currentPropertyLocation();
      if (!active.current) return;
      setHtml(propertyMapHtml(point));
      setState(initialMapState(point));
      setAttempt(n => n + 1);
    } catch (error) {
      if (active.current) setLocationError(error instanceof Error && !/native module|ExpoLocation/i.test(error.message)
        ? error.message : "Lokasi tidak tersedia. Gunakan APK terbaru atau pilih titik secara manual.");
    } finally {
      pending.current = false;
      if (active.current) setLocating(false);
    }
  };
  const onEvent = useCallback((raw: string) => setState(current => receiveMapEvent(current, raw)), []);
  const retry = () => {
    setHtml(propertyMapHtml(state.point));
    setState(initialMapState(state.point));
    setAttempt(n => n + 1);
  };
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between bg-surface px-5 py-2">
        <Text className="flex-1 text-header font-bold text-primary">Pilih lokasi kos</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup peta tanpa menyimpan" onPress={onClose} className="h-12 w-12 items-center justify-center rounded-pill bg-soft">
          <Text className="text-timer text-primary">×</Text>
        </Pressable>
      </View>
      <Text className="px-5 py-4 text-body text-muted">Geser atau ketuk peta hingga pin berada tepat di lokasi kos.</Text>
      <View className="flex-1 min-h-[180px]" pointerEvents={locating ? "none" : "auto"}>
        <PropertyMapSurface key={attempt} html={html} onEvent={onEvent} />
      </View>
      <View className="p-4 gap-3 bg-surface rounded-t-card">
        <Button title={locating ? "Mencari lokasi…" : "Pakai lokasi sekarang"}
          secondary disabled={locating} onPress={() => void locate()} />
        {!!locationError && <Text accessibilityRole="alert" className="text-center text-body text-danger">{locationError}</Text>}
        {!!state.error ? <>
          <Text accessibilityRole="alert" className="text-center text-body text-danger">{state.error}</Text>
          <Button title="Muat ulang peta" secondary disabled={locating} onPress={retry} />
        </> : <Text accessibilityLiveRegion="polite" className="text-center text-label text-muted">
          {!state.ready ? "Memuat peta…" : state.moving ? "Menentukan titik…" : state.point ? "Titik siap dipilih." : "Ketuk atau geser peta untuk memilih titik."}
        </Text>}
        <Button title="Gunakan lokasi ini" disabled={locating || !canConfirmLocation(state)} onPress={() => {
          if (!pending.current && canConfirmLocation(state) && state.point) onConfirm(state.point);
        }} />
      </View>
    </SafeAreaView>
  </Modal>;
}
