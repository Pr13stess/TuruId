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
  const height = Math.min(400, Math.max(280, width * 0.85));
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ x: index * width, animated: false }); }, [width, index]);
  if (!items.length) return <PropertyImage style={{ height }} />;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={event => setIndex(Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}>
      {items.map((item, i) => <View key={item.id} style={{ width, height }}>
        {item.kind === "video" ? <PropertyVideo path={item.path} resolve={resolve} height={height - 32} enabled={index === i && !fullscreen} /> :
          <Pressable accessibilityRole="button" accessibilityLabel={`Perbesar foto ${i + 1 - (video ? 1 : 0)}`} onPress={() => { setIndex(i); setFullscreen(true); }}>
            <PropertyImage uri={item.path} style={{ width, height }} />
          </Pressable>}
      </View>)}
    </ScrollView>
    {items.length > 1 && <View accessible accessibilityRole="text" pointerEvents="none"
      accessibilityLabel={`Media ${index + 1} dari ${items.length}`} accessibilityLiveRegion="polite"
      className={`absolute inset-x-0 flex-row items-center justify-center gap-[6px] ${items[index]?.kind === "video" ? "top-[12px]" : "bottom-[44px]"}`}>
      {items.map((item, i) => <View key={item.id} className={`h-[6px] w-[6px] rounded-pill border border-primary ${index === i ? "bg-accent" : "bg-surface"}`} />)}
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Buka galeri layar penuh" onPress={() => setFullscreen(true)}
      className="absolute right-[10px] top-[10px] h-[44px] w-[44px] items-center justify-center rounded-control bg-media-control">
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessible={false}>
        <Path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6" stroke={colors.surface} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
    {fullscreen && <PropertyPhotoViewer photos={photos} video={video} resolveVideo={resolve} initialIndex={index} onClose={() => setFullscreen(false)} />}
  </View>;
}
