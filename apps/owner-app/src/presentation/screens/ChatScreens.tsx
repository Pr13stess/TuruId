import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Restriction } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
import { colors } from "../theme";
import { ChatConversation } from "../components/ChatConversation";
import {
  Badge,
  Button,
  Card,
  Choices,
  date,
  Empty,
  Feedback,
  Field,
  Load,
  Page,
  Row,
  T,
  Title,
  Toggle,
} from "../components/UI";
export function ChatListScreen() {
  const { communication } = useRepositories();
  const nav = useNav();
  const q = useLoad(
    useCallback(
      async () => ({
        chats: await communication.conversations(),
        calls: await communication.calls(),
      }),
      [communication],
    ),
    10000,
  );
  return (
    <Page title="Percakapan" tab="ChatList" back={false} aligned contentContainerStyle={{ gap: 4 }}>
      <Load {...q} />
      {q.data?.chats.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`Buka chat ${c.tenant}`}
          onPress={() => nav.navigate("Chat", { conversation: c })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.selected, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>{c.tenant.trim().slice(0, 1) || "?"}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>{c.tenant}</Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{c.property_name}</Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>{c.last_message || "Belum ada pesan"}</Text>
            </View>
            {c.unread > 0 && <Badge>{c.unread}</Badge>}
          </View>
        </Pressable>
      ))}
      {q.data?.chats.length === 0 && (
        <Empty
          title="Belum ada percakapan"
          body="Calon penghuni dapat menghubungi Anda dari halaman kos di aplikasi pencari kos."
        />
      )}
      {!!q.data?.calls.length && <View style={{ marginTop: 20, marginBottom: 8 }}><Title>Riwayat panggilan</Title></View>}
      {q.data?.calls.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`Lihat panggilan ${c.id}`}
          onPress={() => nav.navigate("Call", { id: c.id })}
        >
          <Card>
            <Row style={{ flexWrap: "wrap" }}>
              <T>
                {c.call_type === "VOICE"
                  ? "Panggilan suara"
                  : "Panggilan video"}
              </T>
              <Badge tone="navy">{c.status}</Badge>
            </Row>
            <T muted style={{ fontSize: 13 }}>
              {date(c.created_at)} · {c.duration_seconds} detik
            </T>
          </Card>
        </Pressable>
      ))}
    </Page>
  );
}
export function ChatScreen({ route, navigation }: Props<"Chat">) {
  const { communication, support, session } = useRepositories();
  const c = route.params.conversation;
  const a = useAction();
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const clientId = useRef(Crypto.randomUUID());
  const q = useLoad(
    useCallback(() => communication.messages(c.id), [communication, c.id]),
    5000,
  );
  const send = () =>
    void a.run(
      async () => {
        await communication.send(c.id, text, image, clientId.current);
        clientId.current = Crypto.randomUUID();
        setText("");
        setImage("");
      },
      undefined,
      "",
    );
  const pick = (camera: boolean) =>
    void a.run(
      async () => {
        const image = await chooseImage(camera);
        if (image)
          setImage(
            await support.upload({
              ...image,
              purpose: "chat",
              context_id: c.id,
            }),
          );
      },
      undefined,
      "Foto siap dikirim.",
    );
  return (
    <ChatConversation conversation={c} userId={session?.id} messages={q.data ?? []}
      loading={q.loading} error={q.error} retry={q.retry} busy={a.busy} sendError={a.error}
      text={text} image={image} onText={setText} onRemoveImage={() => setImage("")}
      onSend={send} onPick={pick} onBack={() => navigation.goBack()}
      onCall={(type) => void a.run(async () => {
        const call = await communication.startCall(c.id, type);
        navigation.navigate("Call", { id: call.id });
      })}
      onRestrictions={() => navigation.navigate("Restrictions", { conversation: c })}
      onReport={() => navigation.navigate("Report", { targetType: "USER", targetId: c.user_id })}
    />
  );
}
export function RestrictionsScreen({ route }: Props<"Restrictions">) {
  const { communication } = useRepositories();
  const q = useLoad(
    useCallback(() => communication.restrictions(), [communication]),
  );
  return (
    <Page title="Pembatasan pengguna" aligned>
      <Title>{route.params.conversation.tenant}</Title>
      <Load {...q} />
      {q.data && (
        <RestrictionForm
          key={JSON.stringify(q.data)}
          initial={
            q.data.find(
              (r) =>
                r.user_id === route.params.conversation.user_id &&
                r.status === "ACTIVE",
            ) ?? {
              id: "",
              user_id: route.params.conversation.user_id,
              block_communication: false,
              block_booking: false,
              reason: "SPAM",
              notes: "",
              status: "ACTIVE",
            }
          }
        />
      )}
    </Page>
  );
}
function RestrictionForm({ initial }: { initial: Restriction }) {
  const { communication } = useRepositories();
  const a = useAction();
  const [r, setR] = useState(initial);
  return (
    <Card>
      <Toggle
        label="Cegah komunikasi baru"
        value={r.block_communication}
        onChange={(v) => setR({ ...r, block_communication: v })}
      />
      <Toggle
        label="Cegah booking baru"
        value={r.block_booking}
        onChange={(v) => setR({ ...r, block_booking: v })}
      />
      <Choices
        label="Alasan"
        value={r.reason}
        onChange={(v) => setR({ ...r, reason: v })}
        options={[
          { value: "SPAM", label: "Spam" },
          { value: "BAD_BEHAVIOR", label: "Perilaku buruk" },
          { value: "OTHER", label: "Lainnya" },
        ]}
      />
      <Field
        label="Catatan alasan"
        value={r.notes}
        onChange={(v) => setR({ ...r, notes: v })}
        multiline
      />
      <T muted style={{ fontSize: 13 }}>
        Pembatasan berlaku untuk kos Anda. Booking confirmed/active dan riwayat
        transaksi tetap berlaku.
      </T>
      <Button
        title="Simpan pembatasan"
        disabled={a.busy}
        onPress={() => void a.run(() => communication.restrict(r))}
      />
      {!!initial.id && (
        <Button
          title="Cabut pembatasan"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(() =>
              communication.restrict({ ...r, status: "REVOKED" }),
            )
          }
        />
      )}
      <Feedback text={a.error} error />
      <Feedback text={a.message} />
    </Card>
  );
}
