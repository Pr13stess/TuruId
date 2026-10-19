import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";

export function PropertyVideo({ path, resolve }: { path: string; resolve: (path: string) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  return <View style={{ marginVertical: 12 }}>
    {open ? (focused && foreground ? <Video key={path} path={path} resolve={resolve} /> : null) :
      <Pressable accessibilityRole="button" accessibilityLabel="Lihat video kos" onPress={() => setOpen(true)}
        style={{ height: 160, backgroundColor: "#2A2D45", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "white", fontSize: 18 }}>▶ Lihat video kos</Text>
        <Text style={{ color: "white", marginTop: 8 }}>Maksimal 60 detik</Text>
      </Pressable>}
  </View>;
}

function Video({ path, resolve }: { path: string; resolve: (path: string) => Promise<string> }) {
  const player = useVideoPlayer(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const uri = await resolve(path);
        if (!active) return;
        await player.replaceAsync({ uri });
        // Loading never starts playback automatically.
        if (active) { player.pause(); setError(""); }
      } catch { if (active) setError("Video belum bisa diputar. Coba muat ulang."); }
    };
    void load();
    const status = player.addListener("statusChange", event => {
      if (active && event.status === "error") setError("Video belum bisa diputar. Coba muat ulang.");
    });
    // useVideoPlayer owns release on unmount. Never call pause from cleanup:
    // Expo may already have released the shared native object at that point.
    return () => { active = false; status.remove(); };
  }, [path, resolve, player, retry]);
  return <View>
    <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }}
      style={{ width: "100%", height: 220, backgroundColor: "#000" }} />
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="Muat ulang video" onPress={() => setRetry(n => n + 1)} style={{ paddingVertical: 12 }}>
      <Text>Muat ulang video</Text>
    </Pressable>
  </View>;
}
