import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from "react-native";
const demoImages: Record<string, ImageSourcePropType> = {
  "demo://kos-1": require("../../../assets/kos-1.png"),
  "demo://kos-2": require("../../../assets/kos-2.png"),
  "demo://kos-3": require("../../../assets/kos-3.png"),
};
export function PropertyImage({
  uri,
  style,
  resizeMode = "cover",
}: {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  const source = uri ? (demoImages[uri] ?? { uri }) : undefined;
  return (
    <View className="overflow-hidden bg-soft" style={style}>
      {source && !failed ? (
        <Image
          source={source}
          resizeMode={resizeMode}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          onError={() => setFailed(true)}
          accessibilityLabel="Foto kos"
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-[6px]">
          <Text className="text-display text-primary">⌂</Text>
          <Text className="text-caption text-muted">Foto belum tersedia</Text>
        </View>
      )}
    </View>
  );
}
