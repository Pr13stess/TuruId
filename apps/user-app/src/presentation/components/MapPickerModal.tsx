import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReferenceLocation } from "../../domain/models";
import { describeCoordinates } from "../../data/device/DeviceLocation";
import { Button } from "./Primitives";
import { colors } from "../theme";
import { TargetIcon } from "../Icons/Icons";
const fallback = { latitude: -7.7714, longitude: 110.3775 };
/**
 * OpenStreetMap through Leaflet inside a WebView: no Google Maps key and
 * no native map SDK. Tiles come from OSM's public server, which is fine for
 * a demo; switch `tileUrl` to a hosted tile provider before heavy traffic.
 */
const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
function buildHtml(lat: number, lon: number) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
var map=L.map('map').setView([${Number(lat)},${Number(lon)}],15);
L.tileLayer(${JSON.stringify(tileUrl)},{maxZoom:19,
attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
function send(){var c=map.getCenter();
window.ReactNativeWebView.postMessage(JSON.stringify({latitude:c.lat,longitude:c.lng}));}
map.on('moveend',send);send();
</script></body></html>`;
}
export function MapPickerModal({
  initial,
  onClose,
  onConfirm,
}: {
  initial: ReferenceLocation | null;
  onClose: () => void;
  onConfirm: (point: ReferenceLocation) => void;
}) {
  const start = initial ?? fallback;
  const html = useMemo(
    () => buildHtml(start.latitude, start.longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const center = useRef({ latitude: start.latitude, longitude: start.longitude });
  const [busy, setBusy] = useState(false);
  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        latitude?: unknown;
        longitude?: unknown;
      };
      if (
        typeof data.latitude === "number" &&
        typeof data.longitude === "number" &&
        Number.isFinite(data.latitude) &&
        Number.isFinite(data.longitude)
      )
        center.current = { latitude: data.latitude, longitude: data.longitude };
    } catch {
      /* ignore malformed messages */
    }
  }
  async function confirm() {
    setBusy(true);
    const point = center.current;
    const label = await describeCoordinates(point, "Titik di peta");
    setBusy(false);
    onConfirm({ label, ...point });
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-row items-center justify-between gap-[12px] bg-surface p-[20px]">
          <Text className="flex-1 text-price font-bold text-primary">Geser peta ke lokasimu</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup peta"
            className="h-[44px] w-[44px] items-center justify-center rounded-control bg-soft"
            hitSlop={12}
            onPress={onClose}
          >
            <Text className="text-close text-primary">×</Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <WebView
            originWhitelist={["https://*", "about:*"]}
            source={{ html, baseUrl: "https://turuid.demo/" }}
            onMessage={onMessage}
            javaScriptEnabled
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <TargetIcon color={colors.accentStrong} />
          </View>
        </View>
        <View className="gap-[12px] rounded-t-card bg-surface p-[20px]">
          <Text className="text-center text-label leading-muted text-muted">
            Titik acuan adalah bidik di tengah peta. Jarak dihitung sebagai
            garis lurus. Peta © kontributor OpenStreetMap.
          </Text>
          <Button
            title={busy ? "Memproses…" : "Pilih titik ini"}
            disabled={busy}
            onPress={confirm}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
