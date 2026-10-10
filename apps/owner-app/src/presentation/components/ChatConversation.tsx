import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Conversation, Message } from "../../domain/models";
import { colors, radius } from "../theme";
import { Load, Photo } from "./UI";
import { AddImageIcon, CallIcon, VideoCallIcon } from "./ChatIcons";

type Props = {
  conversation: Conversation;
  userId?: string;
  messages: Message[];
  loading: boolean;
  error: string;
  retry: () => void;
  busy: boolean;
  sendError: string;
  text: string;
  image: string;
  onText: (value: string) => void;
  onRemoveImage: () => void;
  onSend: () => void;
  onPick: (camera: boolean) => void;
  onCall: (type: "VOICE" | "VIDEO") => void;
  onBack: () => void;
  onRestrictions: () => void;
  onReport: () => void;
};

function IconButton({ label, onPress, children, disabled = false }: {
  label: string; onPress: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, (disabled || pressed) && { opacity: 0.5 }]}>{children}</Pressable>;
}

export function ChatConversation(p: Props) {
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<Message>>(null);
  const [menu, setMenu] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const scroll = () => list.current?.scrollToEnd({ animated: false });
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton label="Kembali" onPress={p.onBack}>
          <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M20 12H4m7-7-7 7 7 7" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </IconButton>
        <View style={styles.avatar}><Text style={styles.avatarText}>{p.conversation.tenant.trim().slice(0, 1) || "?"}</Text></View>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.headerTitle}>{p.conversation.tenant}</Text>
          <Text numberOfLines={1} style={styles.headerSub}>{p.conversation.property_name}</Text>
        </View>
        <IconButton label="Panggilan suara" disabled={p.busy} onPress={() => p.onCall("VOICE")}><CallIcon color={colors.primary} size={22} /></IconButton>
        <IconButton label="Panggilan video" disabled={p.busy} onPress={() => p.onCall("VIDEO")}><VideoCallIcon color={colors.primary} size={22} /></IconButton>
        <IconButton label={menu ? "Tutup menu chat" : "Menu chat"} onPress={() => setMenu(!menu)}><Text style={styles.more}>⋮</Text></IconButton>
      </View>
      {menu && <View style={styles.menu}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atur" onPress={() => { setMenu(false); p.onRestrictions(); }} style={styles.menuItem}><Text style={styles.menuText}>Pembatasan pengguna</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Laporkan pengguna" onPress={() => { setMenu(false); p.onReport(); }} style={styles.menuItem}><Text style={[styles.menuText, { color: colors.danger }]}>Laporkan pengguna</Text></Pressable>
      </View>}
      {(p.loading || !!p.error) && <View style={styles.load}><Load loading={p.loading} error={p.error} retry={p.retry} /></View>}
      <FlatList ref={list} style={styles.flex} contentContainerStyle={styles.list}
        data={p.messages} keyExtractor={m => m.id} keyboardShouldPersistTaps="handled"
        onContentSizeChange={scroll} onLayout={scroll}
        ListEmptyComponent={!p.loading && !p.error ? <Text style={styles.empty}>Belum ada pesan. Mulai percakapan dengan penyewa.</Text> : null}
        renderItem={({ item: m, index }) => {
          const mine = m.sender_id === p.userId;
          const day = new Date(m.created_at).toLocaleDateString("id-ID");
          const previous = index ? new Date(p.messages[index - 1].created_at).toLocaleDateString("id-ID") : "";
          return <View>
            {day !== previous && <View style={styles.dateWrap}><Text style={styles.dateChip}>{new Date(m.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</Text></View>}
            <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
              <View style={[styles.bubble, mine && styles.bubbleMine, m.message_type === "IMAGE" && { width: 220 }]}>
                {m.message_type === "IMAGE" ? <Photo path={m.storage_path} height={200} /> : <Text style={[styles.bubbleText, mine && { color: colors.surface }]}>{m.text_content}</Text>}
                <Text style={[styles.bubbleTime, mine && { color: colors.selected }]}>{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            </View>
          </View>;
        }} />
      {!!p.sendError && <Text accessibilityRole="alert" style={styles.error}>{p.sendError}</Text>}
      {!!p.image && <View style={styles.preview}>
        <View style={{ width: 100 }}><Photo path={p.image} height={80} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Batal lampiran" disabled={p.busy} onPress={p.onRemoveImage} style={styles.menuItem}><Text style={styles.menuText}>Batal lampiran</Text></Pressable>
      </View>}
      <View style={[styles.composer, { paddingBottom: 12 + (keyboardOpen ? 0 : insets.bottom) }]}>
        <IconButton label="Galeri" disabled={p.busy} onPress={() => p.onPick(false)}><AddImageIcon color={colors.primary} size={24} /></IconButton>
        <TextInput accessibilityLabel="Pesan" style={styles.input} value={p.text} onChangeText={p.onText}
          editable={!p.busy} placeholder="Tulis pesan…" placeholderTextColor={colors.muted} multiline />
        <Pressable accessibilityRole="button" accessibilityLabel={p.sendError ? "Coba kirim lagi" : "Kirim"}
          disabled={p.busy || (!p.text.trim() && !p.image)} onPress={p.onSend}
          style={[styles.send, (p.busy || (!p.text.trim() && !p.image)) && { opacity: 0.5 }]}>
          {p.busy ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={styles.sendIcon}>➤</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  iconButton: { width: 36, minHeight: 44, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.selected, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  headerText: { flex: 1, minWidth: 0, marginHorizontal: 4 },
  headerTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  headerSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  more: { color: colors.primary, fontSize: 26 },
  menu: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 16 },
  menuItem: { minHeight: 44, justifyContent: "center", paddingVertical: 10 },
  menuText: { fontSize: 14, color: colors.primary },
  load: { padding: 16 },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 24 },
  dateWrap: { alignItems: "center", marginVertical: 8 },
  dateChip: { backgroundColor: colors.soft, color: colors.muted, fontSize: 11, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: "hidden" },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: 10, gap: 4 },
  bubbleMine: { backgroundColor: colors.primary, borderColor: colors.primary },
  bubbleText: { color: colors.ink, fontSize: 14 },
  bubbleTime: { color: colors.muted, fontSize: 10, alignSelf: "flex-end" },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 16, paddingVertical: 4 },
  preview: { backgroundColor: colors.surface, padding: 12, flexDirection: "row", alignItems: "center", gap: 16 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 100, backgroundColor: colors.soft, borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  send: { width: 40, height: 40, marginBottom: 2, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendIcon: { color: colors.surface, fontSize: 16 },
});
