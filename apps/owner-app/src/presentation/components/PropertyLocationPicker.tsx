import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { canConfirmLocation, initialMapState, receiveMapEvent, type MapPoint } from "../../domain/propertyLocation";
import { propertyMapHtml } from "./propertyMapHtml";
import { PropertyMapSurface } from "./PropertyMapSurface";
import { Button } from "./UI";
import { colors } from "../theme";

export function PropertyLocationPicker({ initial, onClose, onConfirm }: {
  initial: MapPoint | null; onClose: () => void; onConfirm: (point: MapPoint) => void;
}) {
  const [state, setState] = useState(() => initialMapState(initial));
  const [html, setHtml] = useState(() => propertyMapHtml(initial));
  const [attempt, setAttempt] = useState(0);
  const onEvent = useCallback((raw: string) => setState(current => receiveMapEvent(current, raw)), []);
  const retry = () => {
    setHtml(propertyMapHtml(state.point));
    setState(initialMapState(state.point));
    setAttempt(n => n + 1);
  };
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Pilih lokasi kos</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup peta tanpa menyimpan" onPress={onClose} style={styles.close}>
          <Text style={styles.cross}>×</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Geser atau ketuk peta hingga pin berada tepat di lokasi kos.</Text>
      <View style={styles.map}>
        <PropertyMapSurface key={attempt} html={html} onEvent={onEvent} />
      </View>
      <View style={styles.footer}>
        {!!state.error ? <>
          <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>
          <Button title="Muat ulang peta" secondary onPress={retry} />
        </> : <Text accessibilityLiveRegion="polite" style={styles.status}>
          {!state.ready ? "Memuat peta…" : state.moving ? "Menentukan titik…" : state.point ? "Titik siap dipilih." : "Ketuk atau geser peta untuk memilih titik."}
        </Text>}
        <Button title="Gunakan lokasi ini" disabled={!canConfirmLocation(state)} onPress={() => {
          if (canConfirmLocation(state) && state.point) onConfirm(state.point);
        }} />
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: "700", color: colors.primary },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  cross: { fontSize: 30, color: colors.primary },
  hint: { paddingHorizontal: 20, paddingBottom: 16, color: colors.muted },
  map: { flex: 1, minHeight: 180 },
  footer: { padding: 16, gap: 12 },
  status: { textAlign: "center", color: colors.muted },
  error: { textAlign: "center", color: colors.danger },
});
