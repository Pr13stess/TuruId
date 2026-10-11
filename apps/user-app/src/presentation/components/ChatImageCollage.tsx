import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GalleryItem } from "../../domain/chatGallery";
import { ChatImage } from "./ChatImage";

export function ChatImageCollage({ items, onOpen }: { items: GalleryItem[]; onOpen: (id: string) => void }) {
  const visible = items.slice(0, 4);
  return <View style={styles.grid}>
    {visible.map((item, index) => {
      const wide = items.length === 1 || (items.length === 3 && index === 0);
      const width = wide ? 200 : 98;
      const height = items.length === 1 ? 200 : items.length === 2 ? 160 : 98;
      return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Buka foto ${index + 1} dari ${items.length}`}
        onPress={() => onOpen(item.id)} style={{ width, height, borderRadius: 8, overflow: "hidden" }}>
        <ChatImage path={item.path} fallback={item.fallback} width={width} height={height} />
        {index === 3 && items.length > 4 && <View pointerEvents="none" style={styles.more}><Text style={styles.count}>+{items.length - 4}</Text></View>}
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  grid: { width: 200, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  more: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  count: { color: "#fff", fontSize: 28, fontWeight: "700" },
});
