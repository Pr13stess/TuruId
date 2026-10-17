import { useRef, useState } from "react";
import { View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import type { Review } from "../../domain/models";
import { createReplySubmission, reviewReplyText } from "../../domain/reviewReply";
import { Button, C, Feedback, Field, T } from "./UI";

export function ReviewReplyForm({ review }: { review: Review }) {
  const { properties, mode } = useRepositories();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const lock = useRef(false);
  const send = useRef(createReplySubmission(body => properties.replyReview(review.id, body)));
  const reply = review.owner_reply ?? confirmed;
  async function submit() {
    if (lock.current) return;
    try { reviewReplyText(text); } catch (e) { setError((e as Error).message); return; }
    lock.current = true; setBusy(true); setError(""); setAttempted(true);
    try { await send.current(text); setConfirmed(text.trim()); }
    catch (e) { setError(e instanceof Error ? e.message : "Balasan gagal dikirim."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function check() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const found = (await properties.reviews(review.property_id)).find(r => r.id === review.id);
      if (!found) throw new Error("Ulasan tidak tersedia. Kembali dan muat ulang halaman kos.");
      if (found.owner_reply) setConfirmed(found.owner_reply);
      else setError("Balasan belum ditemukan. Kamu bisa mencoba kirim lagi dengan isi yang sama.");
    } catch (e) { setError(e instanceof Error ? e.message : "Status balasan gagal diperiksa."); }
    finally { lock.current = false; setBusy(false); }
  }
  if (reply) return <View style={{ padding: 12, gap: 6, backgroundColor: C.soft, borderRadius: 10 }}>
    <T style={{ fontWeight: "700" }}>Balasan pemilik</T><T>{reply}</T>
    {mode === "demo" && <T muted>Mode demo · balasan tersimpan di perangkat ini.</T>}
  </View>;
  if (!open) return <Button title="Balas ulasan" secondary onPress={() => setOpen(true)} />;
  return <View style={{ gap: 10 }}>
    <Field label="Balasan pemilik" value={text} onChange={setText} multiline disabled={busy || attempted} />
    <T muted>{[...text.trim()].length}/2000 karakter · Balasan tidak dapat diedit setelah dikirim.</T>
    {mode === "demo" && <T muted>Mode demo · tidak dikirim ke server.</T>}
    <Feedback text={error} error />
    <Button title={busy ? "Memproses…" : attempted ? "Coba kirim lagi" : "Kirim balasan"}
      disabled={busy || !text.trim() || [...text.trim()].length > 2000} onPress={() => void submit()} />
    {attempted ? <Button title="Periksa status balasan" secondary disabled={busy} onPress={() => void check()} /> :
      <Button title="Batal" secondary onPress={() => setOpen(false)} />}
  </View>;
}
