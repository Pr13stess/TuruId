import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import type { PropertyInput } from "../../domain/models";
import { propertyUploadQueue } from "../../domain/propertyGallery";
import { chooseImage } from "../media";
import { choosePropertyMedia, preparePropertyPhoto, type PickedPropertyMedia } from "../propertyMedia";
import { PropertyVideo } from "./PropertyVideo";
import { Badge, Button, Card, Feedback, IconButton, Photo, Row, T, Title } from "./UI";

type Gallery = Pick<PropertyInput, "photos" | "video_path">;

/** Mounted with the editor so partial uploads survive switching tabs. */
export function PropertyGalleryEditor({ value, onChange, disabled, onBusyChange, onPendingChange }: {
  value: Gallery; onChange: (value: Gallery) => void; disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const { support } = useRepositories();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<ReturnType<typeof propertyUploadQueue<PickedPropertyMedia>> | null>(null);
  const resolve = useCallback((path: string) => support.mediaUrl(path), [support]);
  const locked = disabled || busy || !!pending;
  const upload = async (camera = false) => {
    if (disabled || busy) return;
    setBusy(true); onBusyChange(true); setError("");
    let next = { ...value, photos: [...value.photos] };
    try {
      if (camera) {
        if (pending || next.photos.length >= 10) throw new Error("Selesaikan unggahan atau kurangi foto terlebih dahulu.");
        const photo = await chooseImage(true);
        if (photo) {
          const path = await support.upload({ ...photo, purpose: "property" });
          next = { ...next, photos: [...next.photos, path] };
          onChange(next);
        }
      } else {
        let queue = pending;
        if (!queue) {
          const assets = await choosePropertyMedia(next.photos.length, !!next.video_path);
          if (!assets.length) return;
          queue = propertyUploadQueue(assets);
          setPending(queue);
          onPendingChange(true);
        }
        await queue.run(async asset => {
          if (asset.type === "video") {
            const path = await support.uploadPropertyVideo({ uri: asset.uri, uploadId: asset.uploadId, file: asset.file });
            next = { ...next, video_path: path };
          } else {
            const path = await support.upload(await preparePropertyPhoto(asset));
            next = { ...next, photos: [...next.photos, path] };
          }
          onChange(next);
        });
        setPending(null);
        onPendingChange(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); onBusyChange(false); }
  };
  return <View style={{ gap: 12 }}>
    <Row><Title>Galeri kos</Title><Badge>{value.photos.length}/10 foto · {value.video_path ? 1 : 0}/1 video</Badge></Row>
    <T muted>Foto dan video dapat dipilih sekaligus. Video MP4 maksimal 60 detik dan 50 MB.</T>
    <Row style={{ alignItems: "stretch" }}>
      <View style={{ flex: 1 }}><Button title={busy ? "Mengunggah…" : "Pilih foto & video"}
        disabled={locked || (value.photos.length >= 10 && !!value.video_path)} onPress={() => void upload()} /></View>
      <View style={{ flex: 1 }}><Button title="Kamera" secondary disabled={locked || value.photos.length >= 10} onPress={() => void upload(true)} /></View>
    </Row>
    {pending && !busy && <>
      <Button title="Coba unggah sisanya" disabled={disabled} onPress={() => void upload()} />
      <Button title="Batalkan sisa unggahan" secondary disabled={disabled} onPress={() => { setPending(null); onPendingChange(false); setError(""); }} />
      <T muted>Foto yang berhasil diunggah tetap tersimpan dalam pilihan. Retry hanya mengunggah sisanya.</T>
    </>}
    <Feedback text={error} error />
    {value.photos.map((path, i) => <Card key={`${path}-${i}`} style={{ padding: 10 }}>
      <Photo path={path} height={195} />
      <Row><T muted>{i === 0 ? "Foto sampul" : `Foto ${i + 1}`}</T>
        <View pointerEvents={locked ? "none" : "auto"}><IconButton name="close" label={`Hapus foto ${i + 1}`}
          onPress={() => { if (!locked) onChange({ ...value, photos: value.photos.filter((_, n) => n !== i) }); }} /></View>
      </Row>
      {i > 0 && <Button title={`Jadikan foto ${i + 1} sampul`} secondary disabled={locked}
        onPress={() => onChange({ ...value, photos: [path, ...value.photos.filter((_, n) => n !== i)] })} />}
    </Card>)}
    {!!value.video_path && <Card>
      <PropertyVideo path={value.video_path} resolve={resolve} />
      <Button title="Lepaskan video" secondary disabled={locked} onPress={() => onChange({ ...value, video_path: "" })} />
    </Card>}
    {!value.photos.length && <T muted>Tambahkan foto untuk sampul kos.</T>}
  </View>;
}
