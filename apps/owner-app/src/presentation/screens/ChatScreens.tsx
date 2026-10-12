import React, { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Restriction } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
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
  Photo,
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
  const [attachments, setAttachments] = useState(false);
  const [menu, setMenu] = useState(false);
  const clientId = useRef(Crypto.randomUUID());
  const scroll = useRef<ScrollView>(null);
  const previousLast = useRef("");
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
        setAttachments(false);
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
  return (
    <ChatLayout
      title=""
      scrollRef={scroll}
      onContentSizeChange={() => {
        const last = q.data?.[q.data.length - 1]?.id ?? "";
        if (last && last !== previousLast.current) {
          previousLast.current = last;
          scroll.current?.scrollToEnd({ animated: false });
        }
      }}
      heading={
        <View
          style={{
            gap: 5,
            borderBottomWidth: 1,
            borderColor: "#CACBD4",
            paddingBottom: 12,
          }}
        >
          <Row style={{ gap: 7 }}>
            <Avatar name={conversation.tenant} size={58} />
            <View style={{ flex: 1, gap: 3 }}>
              <T style={{ fontSize: 15, fontWeight: "800" }}>
                {conversation.tenant}
              </T>
              <T muted style={{ fontSize: 11, lineHeight: 16 }}>
                {conversation.property_name}
              </T>
            </View>
            <View style={{ flexDirection: "row" }}>
              <IconButton
                name="phone"
                label="Panggilan suara"
                disabled={action.busy}
                onPress={() => startCall("VOICE")}
              />
              <IconButton
                name="video"
                label="Panggilan video"
                disabled={action.busy}
                onPress={() => startCall("VIDEO")}
              />
            </View>
          </Row>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Opsi percakapan"
            onPress={() => setMenu(!menu)}
            style={{
              alignSelf: "flex-end",
              minHeight: 32,
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <T muted style={{ fontSize: 11 }}>
              Opsi percakapan ···
            </T>
          </Pressable>
          {menu && (
            <View>
              <Link
                title="Atur komunikasi"
                onPress={() =>
                  navigation.navigate("Restrictions", { conversation })
                }
              />
              <Link
                title="Laporkan pengguna"
                last
                onPress={() =>
                  navigation.navigate("Report", {
                    targetType: "USER",
                    targetId: conversation.user_id,
                  })
                }
              />
            </View>
          )}
        </View>
      }
      footer={
        <View style={{ gap: 7 }}>
          {image && (
            <Card style={{ padding: 8 }}>
              <Photo path={image} height={110} />
              <Link title="Batal lampiran" last onPress={() => setImage("")} />
            </Card>
          )}
          {attachments && (
            <Row style={{ justifyContent: "flex-start" }}>
              <Button
                title="Galeri"
                secondary
                disabled={action.busy}
                onPress={() => pick(false)}
              />
              <Button
                title="Kamera"
                secondary
                disabled={action.busy}
                onPress={() => pick(true)}
              />
            </Row>
          )}
          <Feedback text={action.error} error />
          <Row
            style={{
              backgroundColor: "#F0F0F2",
              borderRadius: 28,
              gap: 3,
              paddingHorizontal: 4,
              alignItems: "flex-end",
            }}
          >
            <IconButton
              name="attachment"
              label="Lampirkan foto"
              selected={attachments}
              disabled={action.busy}
              color={C.muted}
              onPress={() => setAttachments(!attachments)}
            />
            <TextInput
              accessibilityLabel="Pesan"
              value={text}
              onChangeText={setText}
              editable={!action.busy}
              placeholder="Tulis pesan…"
              placeholderTextColor={C.muted}
              multiline
              style={{
                flex: 1,
                minHeight: 46,
                maxHeight: 110,
                paddingVertical: 13,
                paddingHorizontal: 5,
                fontSize: 13,
                color: C.navy,
              }}
            />
            <IconButton
              name="send"
              label={action.error ? "Coba kirim lagi" : "Kirim pesan"}
              color={C.orangeDark}
              disabled={action.busy || (!text.trim() && !image)}
              onPress={send}
            />
          </Row>
        </View>
      }
    >
      <Load {...q} loading={q.loading && !q.data} />
      {q.data?.map((message) => {
        const outgoing = message.sender_id === session?.id;
        if (message.message_type === "CALL_EVENT")
          return (
            <T
              key={message.id}
              muted
              style={{ textAlign: "center", fontSize: 11 }}
            >
              {message.text_content}
            </T>
          );
        return (
          <View
            key={message.id}
            style={{
              alignSelf: outgoing ? "flex-end" : "flex-start",
              width: "84%",
              borderRadius: 13,
              borderWidth: 1,
              borderColor: "#BFC0C8",
              backgroundColor: C.white,
              padding: 10,
              gap: 6,
            }}
          >
            <Row
              style={{
                flexDirection: outgoing ? "row-reverse" : "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Avatar
                name={outgoing ? "Saya" : conversation.tenant}
                size={35}
              />
              <View style={{ flex: 1, gap: 6 }}>
                {message.message_type === "IMAGE" && (
                  <Photo path={message.storage_path} height={150} />
                )}
                {!!message.text_content && (
                  <T style={{ fontSize: 12, lineHeight: 18 }}>
                    {message.text_content}
                  </T>
                )}
                <T
                  muted
                  style={{
                    fontSize: 9,
                    textAlign: outgoing ? "right" : "left",
                  }}
                >
                  {new Date(message.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </T>
              </View>
            </Row>
          </View>
        );
      })}
      {q.data?.length === 0 && (
        <T muted style={{ textAlign: "center", fontSize: 12 }}>
          Mulai percakapan dengan {conversation.tenant}.
        </T>
      )}
    </ChatLayout>
  );
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
