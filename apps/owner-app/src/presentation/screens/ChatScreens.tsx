import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Restriction } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
import { ChatConversation } from "../components/ChatConversation";
import { OwnerChatListLayout } from "../components/OwnerChatListLayout";
import { colors } from "../theme";
import {
  Badge,
  Button,
  C,
  Card,
  Choices,
  date,
  Empty,
  Feedback,
  Field,
  Link,
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
  const [menu, setMenu] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const q = useLoad(
    useCallback(
      async () => ({
        chats: await communication.conversations(),
        calls: await communication.calls(),
      }),
      [communication],
    ),
    10000,
    true,
  );
  return (
    <OwnerChatListLayout onHistory={() => setHistory(!history)}>
      <Load {...q} loading={q.loading && !q.data} />
      {q.data?.chats.map((conversation) => (
        <View
          key={conversation.id}
          style={{
            borderBottomWidth: 1,
            borderColor: colors.line,
            paddingVertical: 16,
          }}
        >
          <Row style={{ gap: 5 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buka percakapan dengan ${conversation.tenant}`}
              onPress={() => nav.navigate("Chat", { conversation })}
              onLongPress={() => setMenu(menu === conversation.id ? null : conversation.id)}
              accessibilityHint="Tekan lama untuk opsi percakapan"
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 44,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.orange, fontSize: 21, fontWeight: "700" }}>{conversation.tenant.trim().charAt(0).toUpperCase() || "?"}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 17, fontWeight: "700" }}>
                  {conversation.tenant}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>
                  {conversation.last_message || "Mulai percakapan"}
                </Text>
              </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{conversation.updated_at && Number.isFinite(Date.parse(conversation.updated_at)) ? new Date(conversation.updated_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
              {conversation.unread > 0 && <Badge>{conversation.unread}</Badge>}
            </View>
            </Pressable>
          </Row>
          {menu === conversation.id && (
            <View
              style={{ borderTopWidth: 1, borderColor: C.line, marginTop: 10 }}
            >
              <Link
                title="Atur komunikasi"
                onPress={() => nav.navigate("Restrictions", { conversation })}
              />
              <Link
                title="Laporkan pengguna"
                last
                onPress={() =>
                  nav.navigate("Report", {
                    targetType: "USER",
                    targetId: conversation.user_id,
                  })
                }
              />
            </View>
          )}
        </View>
      ))}
      {q.data?.chats.length === 0 && (
        <Empty
          title="Belum ada percakapan"
          body="Pesan calon penghuni akan tampil di sini."
        />
      )}
      {history && (
        <>
          <Title>Riwayat panggilan</Title>
          {q.data?.calls.map((call) => (
            <Pressable
              key={call.id}
              accessibilityRole="button"
              accessibilityLabel={`Lihat panggilan ${call.id}`}
              onPress={() => nav.navigate("Call", { id: call.id })}
            >
              <Card>
                <Row>
                  <T style={{ flex: 1 }}>
                    {call.call_type === "VOICE"
                      ? "Panggilan suara"
                      : "Panggilan video"}
                  </T>
                  <Badge tone="navy">{call.status}</Badge>
                </Row>
                <T muted style={{ fontSize: 11 }}>
                  {date(call.created_at)} · {call.duration_seconds} detik
                </T>
              </Card>
            </Pressable>
          ))}
          {q.data?.calls.length === 0 && (
            <T muted>Belum ada riwayat panggilan.</T>
          )}
        </>
      )}
    </OwnerChatListLayout>
  );
}
export function ChatScreen({ route, navigation }: Props<"Chat">) {
  const { communication, support, session } = useRepositories();
  const conversation = route.params.conversation;
  const action = useAction();
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const clientId = useRef(Crypto.randomUUID());
  const q = useLoad(
    useCallback(
      () => communication.messages(conversation.id),
      [communication, conversation.id],
    ),
    5000,
    true,
  );
  const send = () => {
    if (action.busy || (!text.trim() && !image)) return;
    void action.run(
      async () => {
        await communication.send(
          conversation.id,
          text,
          image,
          clientId.current,
        );
        clientId.current = Crypto.randomUUID();
        setText("");
        setImage("");
      },
      undefined,
      "",
    );
  };
  const pick = (camera: boolean) =>
    void action.run(
      async () => {
        const photo = await chooseImage(camera);
        if (photo)
          setImage(
            await support.upload({
              ...photo,
              purpose: "chat",
              context_id: conversation.id,
            }),
          );
      },
      undefined,
      "",
    );
  const startCall = (type: "VOICE" | "VIDEO") =>
    void action.run(
      async () => {
        const call = await communication.startCall(conversation.id, type);
        navigation.navigate("Call", { id: call.id });
      },
      undefined,
      "",
    );
  return <ChatConversation
    conversation={conversation} userId={session?.id} messages={q.data ?? []}
    loading={q.loading && !q.data} error={q.error} retry={q.retry}
    busy={action.busy} sendError={action.error} text={text} image={image}
    onText={setText} onRemoveImage={() => setImage("")} onSend={send} onPick={pick}
    onCall={startCall} onBack={() => navigation.goBack()}
    onRestrictions={() => navigation.navigate("Restrictions", { conversation })}
    onReport={() => navigation.navigate("Report", { targetType: "USER", targetId: conversation.user_id })}
  />;
}
export function RestrictionsScreen({ route }: Props<"Restrictions">) {
  const { communication } = useRepositories();
  const q = useLoad(
    useCallback(() => communication.restrictions(), [communication]),
  );
  return (
    <Page title="Pembatasan pengguna">
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
      <T muted style={{ fontSize: 12 }}>
        Pembatasan berlaku untuk kos Anda. Booking confirmed/active dan riwayat
        transaksi tetap berlaku.
      </T>
      <Button
        title="Simpan pembatasan"
        disabled={a.busy}
        onPress={() => void a.run(() => communication.restrict(r))}
      />
      {initial.id && (
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
