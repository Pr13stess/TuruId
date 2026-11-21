import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "./Typography";
import { PropertyImage } from "./PropertyImage";

export function PropertyCardPhotos({ images, name, onPress }: { images: string[]; name: string; onPress: () => void }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const photos = images.length ? images : [undefined];

  return (
    <View
      style={{ width: "100%", aspectRatio: 2 }}
      onLayout={({ nativeEvent }) => {
        const nextWidth = nativeEvent.layout.width;
        if (nextWidth !== width) {
          setWidth(nextWidth);
          setPage(0);
        }
      }}
    >
      {width > 0 && <ScrollView
        key={width}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={photos.length > 1}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          setPage(Math.max(0, Math.min(photos.length - 1, Math.round(nativeEvent.contentOffset.x / width))));
        }}
      >
        {photos.map((uri, index) => (
          <Pressable
            key={`${index}:${uri ?? "empty"}`}
            accessibilityRole="button"
            accessibilityLabel={`Lihat ${name}`}
            onPress={onPress}
            style={{ width, height: "100%" }}
          >
            <PropertyImage uri={uri} style={{ width: "100%", height: "100%" }} />
          </Pressable>
        ))}
      </ScrollView>}
      {images.length > 0 && <View
        pointerEvents="none"
        style={{ position: "absolute", bottom: 10, right: 10 }}
        className="rounded-pill bg-surface px-[8px] py-[4px]"
      >
        <Text accessibilityLabel={`Gambar ${page + 1} dari ${images.length}`} className="text-caption font-semibold text-ink">
          {page + 1} / {images.length}
        </Text>
      </View>}
    </View>
  );
}
