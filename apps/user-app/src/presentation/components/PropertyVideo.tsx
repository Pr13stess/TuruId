import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";

export function PropertyVideo({ path, resolve, height = 240, enabled = true }: {
  path: string; resolve: (path: string) => Promise<string>; height?: number; enabled?: boolean;
}) {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => sub.remove();
  }, []);
  return <View style={{ height, backgroundColor: "#080808" }}>
    {enabled && focused && foreground && <Video key={path} path={path} resolve={resolve} height={height} />}
  </View>;
}

function Video({ path, resolve, height }: { path: string; resolve: (path: string) => Promise<string>; height: number }) {
  const player = useVideoPlayer(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const uri = await resolve(path);
        if (!active) return;
        await player.replaceAsync({ uri });
        // Loading never starts playback automatically.
        if (active) { player.pause(); setError(""); setLoading(false); }
      } catch { if (active) { setLoading(false); setError("Video belum bisa diputar. Coba muat ulang."); } }
    };
    void load();
    const status = player.addListener("statusChange", event => {
      if (active && event.status === "error") setError("Video belum bisa diputar. Coba muat ulang.");
    });
    // Expo releases the player on unmount; cleanup must not call pause().
    return () => { active = false; status.remove(); };
  }, [path, resolve, player, retry]);
  return <View style={{ height }}>
    <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: false }}
      style={{ width: "100%", height, backgroundColor: "#000" }} />
    {loading && !error && <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#fff" accessibilityLabel="Memuat preview video" /></View>}
    {!!error && <View style={{ position: "absolute", top: 20, left: 20, right: 20, padding: 12, backgroundColor: "#080808" }}>
      <Text accessibilityRole="alert" style={{ color: "white" }}>{error}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Muat ulang video" onPress={() => { setError(""); setLoading(true); setRetry(n => n + 1); }} style={{ paddingVertical: 12 }}>
        <Text style={{ color: "white" }}>Muat ulang video</Text>
      </Pressable>
    </View>}
  </View>;
}
