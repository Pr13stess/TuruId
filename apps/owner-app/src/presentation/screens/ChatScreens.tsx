import React, { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Restriction } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
import { ChatConversation } from "../components/ChatConversation";
import {
  Avatar,
  Badge,
  ChatLayout,
  IconButton,
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
    <ChatLayout title="Obrolan" tab="ChatList">
      <Load {...q} loading={q.loading && !q.data} />
      {q.data?.chats.map((conversation) => (
        <Card
          key={conversation.id}
          style={{
            borderRadius: 13,
            borderColor: "#BFC0C8",
            padding: 12,
            gap: 0,
          }}
        >
          <Row style={{ gap: 5 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buka percakapan dengan ${conversation.tenant}`}
              onPress={() => nav.navigate("Chat", { conversation })}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 58,
              }}
            >
              <Avatar name={conversation.tenant} size={43} />
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontSize: 13, fontWeight: "800" }}>
                  {conversation.tenant}
                </T>
                <T muted style={{ fontSize: 11, lineHeight: 16 }}>
                  {conversation.last_message || "Mulai percakapan"}
                </T>
              </View>
            </Pressable>
            <View style={{ alignItems: "center" }}>
              {conversation.unread > 0 && <Badge>{conversation.unread}</Badge>}
              <IconButton
                name="more"
                label={`Opsi chat ${conversation.tenant}`}
                onPress={() =>
                  setMenu(menu === conversation.id ? null : conversation.id)
                }
              />
            </View>
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
        </Card>
      ))}
      {q.data?.chats.length === 0 && (
        <Empty
          title="Belum ada percakapan"
          body="Pesan calon penghuni akan tampil di sini."
        />
      )}
      <Button
        title={history ? "Tutup riwayat panggilan" : "Riwayat panggilan"}
        secondary
        onPress={() => setHistory(!history)}
      />
      {history && (
        <>
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
    </ChatLayout>
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
