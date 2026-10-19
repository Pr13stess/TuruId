import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { callEventDisplay } from "../../domain/callEventDisplay";

export function CallEventCard({ text, mine, time }: { text: string | null; mine: boolean; time: string }) {
  const call = callEventDisplay(text);
  const foreground = mine ? colors.surface : colors.primary;
  return <View style={[s.row, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
    <View style={[s.card, { backgroundColor: mine ? colors.primary : colors.surface, borderColor: mine ? colors.primary : colors.line }]}>
      <View style={s.content}>
        <View style={[s.icon, { backgroundColor: mine ? "rgba(255,255,255,0.12)" : colors.soft }]}>
          <Ionicons name={call.video ? "videocam" : "call"} size={22} color={foreground} />
        </View>
        <View style={s.labels}>
          <Text style={[s.title, { color: foreground }]}>{call.title}</Text>
          <View style={s.detailRow}>
            <Ionicons name={mine ? "arrow-up-outline" : "arrow-down-outline"} size={13}
              color={mine ? colors.selected : call.unsuccessful ? colors.danger : colors.muted} />
            <Text style={[s.detail, { color: mine ? colors.selected : call.unsuccessful ? colors.danger : colors.muted }]}>{call.detail}</Text>
          </View>
        </View>
      </View>
      <Text style={[s.time, { color: mine ? colors.selected : colors.muted }]}>{time}</Text>
    </View>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 4 },
  card: { maxWidth: "88%", minWidth: 230, borderRadius: 18, borderWidth: 1, padding: 12, gap: 5 },
  content: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  labels: { flexShrink: 1, gap: 5 },
  title: { fontSize: 15, fontWeight: "700" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  detail: { fontSize: 13, flexShrink: 1 },
  time: { fontSize: 11, alignSelf: "flex-end" },
});
