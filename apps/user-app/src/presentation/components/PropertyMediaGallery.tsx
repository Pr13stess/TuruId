import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { propertyGallery } from "../../domain/propertyGallery";
import { colors } from "../theme";
import { PropertyImage } from "./PropertyImage";
import { PropertyVideo } from "./PropertyVideo";
import { PropertyPhotoViewer } from "./PropertyPhotoViewer";

export function PropertyMediaGallery({ photos, video, resolve }: {
  photos: string[]; video?: string; resolve: (path: string) => Promise<string>;
}) {
  const items = propertyGallery(photos, video);
  const dimensions = useWindowDimensions();
  const [width, setWidth] = useState(Math.min(600, dimensions.width));
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ x: index * width, animated: false }); }, [width, index]);
  if (!items.length) return <PropertyImage style={{ height: 240 }} />;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={event => setIndex(Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}>
      {items.map((item, i) => <View key={item.id} style={{ width, height: 240 }}>
        {item.kind === "video" ? <PropertyVideo path={item.path} resolve={resolve} enabled={index === i && !fullscreen} /> :
          <Pressable accessibilityRole="button" accessibilityLabel={`Perbesar foto ${i + 1 - (video ? 1 : 0)}`} onPress={() => { setIndex(i); setFullscreen(true); }}>
            <PropertyImage uri={item.path} style={{ width, height: 240 }} />
          </Pressable>}
      </View>)}
    </ScrollView>
    {items.length > 1 && <View accessible accessibilityRole="text" pointerEvents="none"
      accessibilityLabel={`Media ${index + 1} dari ${items.length}`} accessibilityLiveRegion="polite"
      style={{ position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 }}>
      {items.map((item, i) => <View key={item.id} style={{ width: 6, height: 6, borderRadius: 3,
        borderWidth: 0.5, borderColor: colors.primary,
        backgroundColor: index === i ? colors.orange : colors.surface }} />)}
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Buka galeri layar penuh" onPress={() => setFullscreen(true)}
      style={{ position: "absolute", top: 10, right: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "#08080888", alignItems: "center", justifyContent: "center" }}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessible={false}>
        <Path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
    {fullscreen && <PropertyPhotoViewer photos={photos} video={video} resolveVideo={resolve} initialIndex={index} onClose={() => setFullscreen(false)} />}
  </View>;
}
