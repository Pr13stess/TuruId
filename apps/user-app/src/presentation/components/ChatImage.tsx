import { useEffect, useRef, useState } from "react";
import { AppState, Image, Pressable, Text, View } from "react-native";
import { useRepositories } from "../../providers/RepositoryProvider";
import { imageRenewal } from "../../domain/chatImage";

export function ChatImage({ path, fallback = "", height = 200, width = height, resizeMode = "cover" }: { path?: string | null; fallback?: string | null; height?: number; width?: number; resizeMode?: "cover" | "contain" }) {
  const { chat } = useRepositories();
  const [state, setState] = useState({ source: "", url: "", failed: false });
  const controller = useRef<ReturnType<typeof imageRenewal> | null>(null);
  useEffect(() => {
    const current = imageRenewal(
      () => path ? chat.chatImageUrl(path) : Promise.resolve({ url: fallback || "", expiresAt: Infinity }),
      (url, failed) => setState({ source: path || fallback || "", url, failed }),
    );
    controller.current = current;
    void current.refresh();
    const listener = AppState.addEventListener("change", state => { if (state === "active") current.resume(); });
    return () => { current.stop(); listener.remove(); };
  }, [path, fallback, chat]);
  const visible = state.source === (path || fallback || "") ? state : { url: "", failed: false };
  return <View style={{ width, height, borderRadius: 8, overflow: "hidden" }}>
    {visible.url ? <Image source={{ uri: visible.url }} style={{ width: "100%", height: "100%" }} resizeMode={resizeMode} onError={() => controller.current?.failed()} /> :
      <Pressable accessibilityRole="button" accessibilityLabel="Muat ulang gambar" onPress={() => void controller.current?.refresh()} style={{ flex: 1, justifyContent: "center" }}>
        <Text style={resizeMode === "contain" ? { color: "#fff" } : undefined}>{visible.failed ? "Gambar belum tersedia. Coba lagi." : "Memuat gambar…"}</Text>
      </Pressable>}
  </View>;
}
