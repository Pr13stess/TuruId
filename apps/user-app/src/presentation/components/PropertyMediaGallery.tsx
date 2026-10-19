import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { propertyGallery } from "../../domain/propertyGallery";
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
  const choose = (i: number) => { setIndex(i); scroll.current?.scrollTo({ x: i * width, animated: true }); };
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
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
        {items.map((item, i) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.kind === "video" ? "Video kos" : `Foto ${i + 1 - (video ? 1 : 0)}`}
          accessibilityState={{ selected: index === i }} onPress={() => choose(i)}
          style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 8, backgroundColor: index === i ? "#2A2D45" : "#F3F1EC" }}>
          <Text style={{ color: index === i ? "white" : "#2A2D45" }}>{item.kind === "video" ? "Video" : `Foto ${i + 1 - (video ? 1 : 0)}`}</Text>
        </Pressable>)}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Buka galeri layar penuh" onPress={() => setFullscreen(true)} style={{ padding: 10, minHeight: 44, justifyContent: "center" }}>
        <Text>{index + 1}/{items.length} · Perbesar</Text>
      </Pressable>
    </View>
    {fullscreen && <PropertyPhotoViewer photos={photos} video={video} resolveVideo={resolve} initialIndex={index} onClose={() => setFullscreen(false)} />}
  </View>;
}
