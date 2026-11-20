import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "../theme";

export function PropertyVideo({ path, resolve, height = 240, enabled = true, contentFit = "contain" }: {
  path: string; resolve: (path: string) => Promise<string>; height?: number; enabled?: boolean; contentFit?: "contain" | "cover";
}) {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => sub.remove();
  }, []);
  return <View className="overflow-hidden bg-media" style={{ height }}>
    {enabled && focused && foreground && <Video key={path} path={path} resolve={resolve} height={height} contentFit={contentFit} />}
  </View>;
}

function Video({ path, resolve, height, contentFit }: { path: string; resolve: (path: string) => Promise<string>; height: number; contentFit: "contain" | "cover" }) {
  const player = useVideoPlayer(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let sourceRequested = false;
    const updateStatus = (status: typeof player.status) => {
      if (!active || !sourceRequested) return;
      if (status === "error") {
        setLoading(false);
        setError("Video belum bisa diputar. Coba muat ulang.");
      } else if (status === "readyToPlay") {
        setLoading(false);
        setError("");
      } else {
        setLoading(true);
      }
    };
    const status = player.addListener("statusChange", event => updateStatus(event.status));
    const load = async () => {
      try {
        const uri = await resolve(path);
        if (!active) return;
        // Pause before loading, never after the user can start playback.
        player.pause();
        sourceRequested = true;
        await player.replaceAsync({ uri });
        // Android replacement can finish before the media is ready.
        if (active) updateStatus(player.status);
      } catch { if (active) { setLoading(false); setError("Video belum bisa diputar. Coba muat ulang."); } }
    };
    void load();
    // Expo releases the player on unmount; cleanup must not call pause().
    return () => { active = false; status.remove(); };
  }, [path, resolve, player, retry]);
  return <View style={{ height }}>
    <VideoView player={player} nativeControls contentFit={contentFit} fullscreenOptions={{ enable: false }}
      style={{ width: "100%", height, backgroundColor: colors.mediaCanvas }} />
    {loading && !error && <View pointerEvents="none" className="absolute inset-0 items-center justify-center"><ActivityIndicator color={colors.surface} accessibilityLabel="Memuat preview video" /></View>}
    {!!error && <View className="absolute left-[20px] right-[20px] top-[20px] rounded-control bg-media p-[12px]">
      <Text accessibilityRole="alert" className="text-body leading-body text-surface">{error}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Muat ulang video" onPress={() => { setError(""); setLoading(true); setRetry(n => n + 1); }} className="py-[12px]">
        <Text className="text-body leading-body text-surface">Muat ulang video</Text>
      </Pressable>
    </View>}
  </View>;
}
