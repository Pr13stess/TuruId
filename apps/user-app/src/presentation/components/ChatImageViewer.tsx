import { useState } from "react";
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initialPhoto, type GalleryItem } from "../../domain/chatGallery";
import { photoGesture } from "../../domain/chatGesture";
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
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup gambar" onPress={onClose} style={styles.button}><Text style={styles.text}>✕</Text></Pressable>
      </View>
      <View style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Gambar sebelumnya" disabled={index === 0} onPress={previous} style={[styles.button, index === 0 && styles.disabled]}><Text style={styles.text}>‹</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Gambar berikutnya" disabled={index >= items.length - 1} onPress={next} style={[styles.button, index >= items.length - 1 && styles.disabled]}><Text style={styles.text}>›</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function ZoomPhoto({ item, width, height, onPrevious, onNext, onClose }: { item: GalleryItem; width: number; height: number; onPrevious: () => void; onNext: () => void; onClose: () => void }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [pan] = useState(() => new Animated.ValueXY());
  const [responder] = useState(() => {
    const gesture = photoGesture(width, height, frame => {
      scale.setValue(frame.scale);
      pan.setValue({ x: frame.x, y: frame.y });
    }, action => {
      if (action === "next") onNext();
      else if (action === "previous") onPrevious();
      else onClose();
    });
    return PanResponder.create({
      // Own the touch stream from the first finger, including touches over the image.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: e => gesture.begin(e.nativeEvent.touches),
      onPanResponderStart: e => gesture.move(e.nativeEvent.touches),
      onPanResponderMove: e => gesture.move(e.nativeEvent.touches),
      onPanResponderEnd: e => gesture.move(e.nativeEvent.touches),
      onPanResponderRelease: () => gesture.end(),
      onPanResponderTerminate: () => gesture.end(true),
    });
  });
  return <View collapsable={false} style={{ width, height, overflow: "hidden", backgroundColor: "#080808" }} {...responder.panHandlers}>
    <Animated.View pointerEvents="none" style={{ transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] }}>
      <ChatImage path={item.path} fallback={item.fallback} width={width} height={height} resizeMode="contain" />
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808", justifyContent: "center", alignItems: "center" },
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bottom: { position: "absolute", left: 8, right: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  text: { color: "#fff", fontSize: 18, fontWeight: "600" },
  button: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  disabled: { opacity: 0.3 },
});
