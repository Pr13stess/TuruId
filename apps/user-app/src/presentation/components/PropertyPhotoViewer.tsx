import { useRef, useState } from "react";
import { Animated, Modal, PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initialPhoto } from "../../domain/chatGallery";
import { propertyPhotoZoom } from "../../domain/propertyPhotoZoom";
import { PropertyImage } from "./PropertyImage";
import { PropertyVideo } from "./PropertyVideo";
import { propertyGallery } from "../../domain/propertyGallery";

export function PropertyPhotoViewer({ photos, video, resolveVideo, initialIndex, onClose }: {
  photos: string[]; video?: string; resolveVideo?: (path: string) => Promise<string>;
  initialIndex: number; onClose: () => void;
}) {
  const items = propertyGallery(photos, video);
  const initialId = items[initialIndex]?.id ?? items[0]?.id;
  const [index, setIndex] = useState(() => initialPhoto(items, initialId ?? ""));
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const [zoomed, setZoomed] = useState(false);
  const pageHeight = Math.max(1, height - insets.top - insets.bottom - 120);
  const go = (i: number) => {
    setZoomed(false);
    pager.current?.scrollTo({ x: Math.max(0, Math.min(items.length - 1, i)) * width, y: 0, animated: true });
  };
  const previous = () => go(index - 1);
  const next = () => go(index + 1);
  return <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent presentationStyle="overFullScreen">
    <View className="flex-1 items-center justify-center bg-media" accessibilityViewIsModal>
      <ScrollView key={width} ref={pager} horizontal pagingEnabled directionalLockEnabled
        bounces={false} alwaysBounceVertical={false} alwaysBounceHorizontal={false} overScrollMode="never"
        showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
        scrollEnabled={!zoomed} contentOffset={{ x: index * width, y: 0 }}
        style={{ flexGrow: 0, width, height: pageHeight }}
        onMomentumScrollEnd={event => {
          setIndex(Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
          setZoomed(false);
        }}>
        {items.map((item, i) => <View key={item.id} style={{ width, height: pageHeight, overflow: "hidden" }}>
          {item.kind === "video" && resolveVideo
            ? <PropertyVideo path={item.path} resolve={resolveVideo} height={pageHeight} enabled={index === i} />
            : <ZoomPhoto key={`${item.id}:${index}:${width}:${height}`} item={item} width={width} height={pageHeight} onZoom={setZoomed} />}
        </View>)}
      </ScrollView>
      <View className="absolute left-[16px] right-[16px] flex-row items-center justify-between" style={{ top: insets.top + 8 }}>
        <Text accessibilityLiveRegion="polite" className="text-price font-semibold text-surface">{items.length ? index + 1 : 0}/{items.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup galeri" onPress={onClose} className="min-h-[48px] min-w-[48px] items-center justify-center rounded-control bg-media-control px-[12px]"><Text className="text-price font-semibold text-surface">✕</Text></Pressable>
      </View>
      <View className="absolute left-[8px] right-[8px] flex-row items-center justify-between" style={{ bottom: insets.bottom + 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Media sebelumnya" disabled={index === 0} onPress={previous} className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-control bg-media-control px-[12px] ${index === 0 ? "opacity-30" : ""}`}><Text className="text-price font-semibold text-surface">‹</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Media berikutnya" disabled={index >= items.length - 1} onPress={next} className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-control bg-media-control px-[12px] ${index >= items.length - 1 ? "opacity-30" : ""}`}><Text className="text-price font-semibold text-surface">›</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function ZoomPhoto({ item, width, height, onZoom }: {
  item: { id: string; path: string }; width: number; height: number; onZoom: (value: boolean) => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const [panX] = useState(() => new Animated.Value(0));
  const [responder] = useState(() => {
    let magnified = false;
    const gesture = propertyPhotoZoom(width, (value, x) => {
      scale.setValue(value); panX.setValue(x);
      magnified = value > 1.01;
      onZoom(magnified);
    });
    return PanResponder.create({
      // Single-finger swipes at normal size belong to the paging ScrollView.
      onStartShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2 || magnified,
      onMoveShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2 || magnified,
      onMoveShouldSetPanResponderCapture: e => e.nativeEvent.touches.length >= 2 || magnified,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => gesture.begin(e.nativeEvent.touches),
      onPanResponderStart: e => gesture.move(e.nativeEvent.touches),
      onPanResponderMove: e => gesture.move(e.nativeEvent.touches),
      onPanResponderEnd: e => gesture.move(e.nativeEvent.touches),
      onPanResponderRelease: () => gesture.end(),
      onPanResponderTerminate: () => gesture.end(),
    });
  });
  return <View collapsable={false} style={{ width, height, overflow: "hidden" }} {...responder.panHandlers}>
    <Animated.View pointerEvents="none" style={{ transform: [{ translateX: panX }, { scale }] }}>
      <PropertyImage uri={item.path} style={{ width, height }} resizeMode="contain" />
    </Animated.View>
  </View>;
}
