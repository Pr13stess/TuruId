import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useResource } from "../../hooks/useResource";
import { Status } from "../../components/Primitives";
import { ActionButton } from "../../components/ProfileUi";
import { colors } from "../../theme";
import { NOTE_MAX_LENGTH } from "../../../domain/models";
import { NoteConflictError } from "../../../domain/repositories/NoteRepository";

export function NoteScreen({ route, navigation }: ScreenProps<"Note">) {
  const { propertyId, propertyName } = route.params;
  const { notes } = useRepositories();
  const loader = useCallback(
    () => notes.getByProperty(propertyId, propertyName),
    [notes, propertyId, propertyName],
  );
  const state = useResource(loader);
  // Seeded from the loaded note on first render, then overridden by
  // whatever the user has typed — the same derived-form pattern as
  // EditProfileScreen, so no effect is needed to sync it in.
  const [edited, setEdited] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const originalContent = state.data?.content ?? "";
  const content = edited ?? originalContent;
  const dirty = edited !== null && edited !== originalContent;
  const busy = saving || deleting;

  if (state.loading || state.error)
    return (
      <Status
        loading={state.loading}
        error={state.error}
        onRetry={state.error ? state.retry : undefined}
      />
    );

  const save = async () => {
    if (!dirty || busy) return;
    setSaving(true);
    try {
      await notes.save(
        propertyId,
        propertyName,
        content,
        state.data?.version ?? null,
      );
      navigation.goBack();
    } catch (e) {
      if (e instanceof NoteConflictError) {
        Alert.alert("Catatan sudah berubah", e.message, [
          { text: "Muat ulang", onPress: () => state.retry() },
        ]);
      } else {
        Alert.alert(
          "Catatan belum tersimpan",
          e instanceof Error ? e.message : "Coba lagi.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!state.data || busy) return;
    Alert.alert(
      "Hapus catatan?",
      "Catatan untuk kos ini akan dihapus dan tidak bisa dikembalikan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await notes.deleteByProperty(propertyId);
              navigation.goBack();
            } catch (e) {
              Alert.alert(
                "Catatan belum terhapus",
                e instanceof Error ? e.message : "Coba lagi.",
              );
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const nearLimit = content.length > NOTE_MAX_LENGTH * 0.9;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.body}>
        <Text style={styles.hint}>
          Catatan ini hanya kamu yang bisa membaca — pemilik kos tidak
          memiliki akses.
        </Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={(text) => setEdited(text.slice(0, NOTE_MAX_LENGTH))}
          placeholder="Tulis catatan pribadi tentang kos ini…"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          textAlignVertical="top"
          editable={!busy}
        />
        <Text style={[styles.counter, nearLimit && styles.counterWarn]}>
          {content.length}/{NOTE_MAX_LENGTH}
        </Text>
      </View>
      <View style={styles.actions}>
        {state.data && (
          <View style={styles.actionSlot}>
            <ActionButton
              title="Hapus catatan"
              variant="outline"
              loading={deleting}
              disabled={saving}
              onPress={remove}
            />
          </View>
        )}
        <View style={styles.actionSlot}>
          <ActionButton
            title="Simpan catatan"
            loading={saving}
            disabled={!dirty || deleting}
            onPress={save}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: 16, gap: 8 },
  hint: { color: colors.muted, fontSize: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.ink,
  },
  counter: { alignSelf: "flex-end", fontSize: 11, color: colors.muted },
  counterWarn: { color: colors.danger },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  actionSlot: { flex: 1 },
});
