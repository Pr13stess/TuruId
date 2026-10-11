import { useState } from "react";
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clamp, initialPhoto, swipeAction, type GalleryItem } from "../../domain/chatGallery";
import { ChatImage } from "./ChatImage";

export function ChatImageViewer({ items, initialId, onClose }: { items: GalleryItem[]; initialId: string; onClose: () => void }) {
  const [index, setIndex] = useState(() => initialPhoto(items, initialId));
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const previous = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(items.length - 1, i + 1));
  const item = items[index];
  return <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent presentationStyle="overFullScreen">
    <View style={styles.root} accessibilityViewIsModal>
      {item && <ZoomPhoto key={`${item.id}:${width}:${height}`} item={item} width={width} height={Math.max(1, height - insets.top - insets.bottom - 120)}
        onPrevious={previous} onNext={next} onClose={onClose} />}
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Text accessibilityLiveRegion="polite" style={styles.text}>{items.length ? index + 1 : 0}/{items.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup gambar" onPress={onClose} style={styles.button}><Text style={styles.text}>Tutup ✕</Text></Pressable>
      </View>
      <View style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Gambar sebelumnya" disabled={index === 0} onPress={previous} style={[styles.button, index === 0 && styles.disabled]}><Text style={styles.text}>‹</Text></Pressable>
        <Text style={styles.hint}>Cubit untuk zoom · Geser ke bawah untuk tutup</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Gambar berikutnya" disabled={index >= items.length - 1} onPress={next} style={[styles.button, index >= items.length - 1 && styles.disabled]}><Text style={styles.text}>›</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function ZoomPhoto({ item, width, height, onPrevious, onNext, onClose }: { item: GalleryItem; width: number; height: number; onPrevious: () => void; onNext: () => void; onClose: () => void }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [pan] = useState(() => new Animated.ValueXY());
  const [responder] = useState(() => {
    let current = { scale: 1, x: 0, y: 0 };
    let start = { scale: 1, x: 0, y: 0, distance: 0, pinched: false, dx: 0, dy: 0 };
    return PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length > 1 || Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderGrant: () => { start = { ...current, distance: 0, pinched: false, dx: 0, dy: 0 }; },
    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
        if (!start.distance) { start.distance = Math.max(1, distance); start.scale = current.scale; }
        start.pinched = true;
        const value = clamp(start.scale * distance / start.distance, 1, 4);
        current.scale = value;
        current.x = clamp(current.x, -width * (value - 1) / 2, width * (value - 1) / 2);
        current.y = clamp(current.y, -height * (value - 1) / 2, height * (value - 1) / 2);
        scale.setValue(value); pan.setValue({ x: current.x, y: current.y });
        // Rebase translation when a finger lifts: don't jump to the old drag origin.
        start.x = current.x; start.y = current.y; start.dx = g.dx; start.dy = g.dy;
      } else if (current.scale > 1.01) {
        start.distance = 0;
        current.x = clamp(start.x + g.dx - start.dx, -width * (current.scale - 1) / 2, width * (current.scale - 1) / 2);
        current.y = clamp(start.y + g.dy - start.dy, -height * (current.scale - 1) / 2, height * (current.scale - 1) / 2);
        pan.setValue({ x: current.x, y: current.y });
      } else if (!start.pinched) {
        pan.setValue({ x: g.dx * 0.25, y: Math.max(0, g.dy) });
      }
    },
    onPanResponderRelease: (_e, g) => {
      if (!start.pinched) {
        const action = swipeAction(g.dx, g.dy, current.scale);
        if (action === "close") onClose();
        else if (action === "next") onNext();
        else if (action === "previous") onPrevious();
      }
      if (current.scale <= 1.01) { current = { scale: 1, x: 0, y: 0 }; scale.setValue(1); pan.setValue({ x: 0, y: 0 }); }
    },
    onPanResponderTerminate: () => { pan.setValue({ x: current.x, y: current.y }); },
    });
  });
  return <View style={{ width, height, overflow: "hidden" }} {...responder.panHandlers}>
    <Animated.View style={{ transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] }}>
      <ChatImage path={item.path} fallback={item.fallback} width={width} height={height} resizeMode="contain" />
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808", justifyContent: "center", alignItems: "center" },
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bottom: { position: "absolute", left: 8, right: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  text: { color: "#fff", fontSize: 18, fontWeight: "600" },
  hint: { color: "#ddd", fontSize: 11, flex: 1, textAlign: "center" },
  button: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  disabled: { opacity: 0.3 },
});
