import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { PropertyInput } from "../../domain/models";
import { Props } from "../navigation";
import { useAction } from "../hooks";
import { usePropertyEdit } from "../usePropertyEdit";
import { chooseImage } from "../media";
import { choosePropertyMedia, preparePropertyPhoto, type PickedPropertyMedia } from "../propertyMedia";
import { propertyUploadQueue } from "../../domain/propertyGallery";
import { PropertyVideo } from "../components/PropertyVideo";
import { PropertyLocationPicker } from "../components/PropertyLocationPicker";
import { mapPoint } from "../../domain/propertyLocation";
import {
  Badge,
  Button,
  Card,
  Choices,
  Feedback,
  Field,
  Link,
  Page,
  Photo,
  Row,
  T,
  Title,
} from "../components/UI";
export function PropertyFormScreen({
  route,
  navigation,
}: Props<"PropertyForm">) {
  const { properties, support } = useRepositories();
  const action = useAction();
  const edit = usePropertyEdit();
  const old = route.params.property;
  const [value, setValue] = useState<PropertyInput>(
    old ?? {
      id: "",
      name: "",
      address: "",
      city: "",
      province: "",
      latitude: null,
      longitude: null,
      gender_type: "MIXED",
      description: "",
      rules: "",
      publication_status: "DRAFT",
      photos: [],
      facilities: [],
    },
  );
  const [pickingLocation, setPickingLocation] = useState(false);
  const location = mapPoint(value);
  const [evidence, setEvidence] = useState("");
  const [pending, setPending] = useState<ReturnType<typeof propertyUploadQueue<PickedPropertyMedia>> | null>(null);
  const [progress, setProgress] = useState("");
  const videoUrl = useCallback((path: string) => support.mediaUrl(path), [support]);
  const uploadGallery = () => action.run(async () => {
    let queue = pending;
    if (!queue) {
      const assets = await choosePropertyMedia(value.photos.length, !!value.video_path);
      if (!assets.length) return;
      queue = propertyUploadQueue(assets);
      setPending(queue);
    }
    await queue.run(async asset => {
      setProgress("Mengunggah media. Jangan tutup halaman ini.");
      if (asset.type === "video") {
        const path = await support.uploadPropertyVideo({ uri: asset.uri, uploadId: asset.uploadId, file: asset.file });
        setValue(v => ({ ...v, video_path: path }));
      } else {
        const path = await support.upload(await preparePropertyPhoto(asset));
        setValue(v => ({ ...v, photos: [...v.photos, path] }));
      }
    });
    setPending(null);
    setProgress("");
  }, undefined, "Media siap. Simpan kos untuk menerapkan perubahan.").finally(() => setProgress(""));
  const set = <K extends keyof PropertyInput>(key: K, v: PropertyInput[K]) =>
    setValue((s) => ({ ...s, [key]: v }));
  const upload = (purpose: "property" | "verification", camera = false) =>
    action.run(
      async () => {
        if (purpose === "property" && value.photos.length >= 10) throw new Error("Galeri kos maksimal 10 foto.");
        const image = await chooseImage(camera);
        if (!image) return;
        const path = await support.upload({ ...image, purpose });
        if (purpose === "property") set("photos", [...value.photos, path]);
        else setEvidence(path);
      },
      undefined,
      "Foto siap. Simpan untuk menerapkan perubahan.",
    );
  return (
    <Page title={old ? "Edit properti" : "Tambahkan kos"}>
      {pickingLocation && <PropertyLocationPicker initial={location}
        onClose={() => setPickingLocation(false)}
        onConfirm={point => {
          setValue(current => ({ ...current, ...point }));
          setPickingLocation(false);
        }} />}
      <Badge>DATA KOS</Badge>
      <Title>Ruang baru, cerita baru.</Title>
      <T muted>
        Lengkapi informasi kos agar calon penyewa mendapat gambaran yang jelas.
      </T>
      <Card>
        <Title>Identitas kos</Title>
        <Field
          label="Nama kos"
          value={value.name}
          onChange={(v) => set("name", v)}
        />
        <Field
          label="Alamat lengkap"
          value={value.address}
          onChange={(v) => set("address", v)}
          multiline
        />
        <Field
          label="Kota"
          value={value.city}
          onChange={(v) => set("city", v)}
        />
        <Field
          label="Provinsi"
          value={value.province}
          onChange={(v) => set("province", v)}
        />
        <Choices
          label="Tipe kos"
          value={value.gender_type}
          onChange={(v) => set("gender_type", v)}
          options={[
            { value: "MALE", label: "Putra" },
            { value: "FEMALE", label: "Putri" },
            { value: "MIXED", label: "Campur" },
          ]}
        />
        <Title>Lokasi kos</Title>
        <T muted>{location ? "Titik lokasi sudah dipilih." : "Belum ada titik lokasi. Pilih di peta agar calon penyewa dapat menemukan kos."}</T>
        <Button title={location ? "Ubah lokasi di peta" : "Pilih lokasi kos"}
          secondary disabled={action.busy} onPress={() => setPickingLocation(true)} />
        {!!location && <Link title="Lepaskan titik lokasi" onPress={() => {
          if (!action.busy) setValue(current => ({ ...current, latitude: null, longitude: null }));
        }} />}
      </Card>
      <Card>
        <Title>Detail & fasilitas</Title>
        <Field
          label="Deskripsi"
          value={value.description}
          onChange={(v) => set("description", v)}
          multiline
        />
        <Field
          label="Peraturan kos"
          value={value.rules}
          onChange={(v) => set("rules", v)}
          multiline
        />
        <Field
          label="Fasilitas umum (pisahkan koma)"
          value={value.facilities.join(",")}
          onChange={(v) => set("facilities", v.split(","))}
        />
        <Choices
          label="Status tayang"
          value={value.publication_status}
          onChange={(v) => set("publication_status", v)}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "ACTIVE", label: "Aktif" },
            { value: "INACTIVE", label: "Nonaktif" },
          ]}
        />
        <T muted style={{ fontSize: 13 }}>
          Kos tampil publik setelah owner dan properti disetujui admin. Edit
          informasi mengajukan pemeriksaan ulang.
        </T>
      </Card>
      <Card>
        <Title>Galeri kos</Title>
        <T muted>{value.photos.length}/10 foto · {value.video_path ? 1 : 0}/1 video</T>
        <T muted>Foto dan video dapat dipilih sekaligus. Video MP4 maksimal 60 detik dan 50 MB. Sampul tetap foto.</T>
        {value.photos.map((p, i) => (
          <View key={p + i}>
            <Photo path={p} />
            <Row style={{ flexWrap: "wrap" }}>
              <T muted style={{ fontSize: 13 }}>
                {i === 0 ? "Foto sampul" : `Foto ${i + 1}`}
              </T>
              <Link
                title="Jadikan sampul"
                onPress={() =>
                  !action.busy && !pending && set("photos", [p, ...value.photos.filter((_, n) => n !== i)])
                }
              />
              <Link
                title="Hapus"
                onPress={() =>
                  !action.busy && !pending && set(
                    "photos",
                    value.photos.filter((_, n) => n !== i),
                  )
                }
              />
            </Row>
          </View>
        ))}
        {!!value.video_path && <View>
          <PropertyVideo path={value.video_path} resolve={videoUrl} />
          <Link title="Lepaskan video" onPress={() => { if (!action.busy && !pending) set("video_path", ""); }} />
        </View>}
        {!!progress && <T muted>{progress}</T>}
        {!!pending && !action.busy && <Row>
          <Button title="Coba unggah sisanya" onPress={() => void uploadGallery()} />
          <Link title="Batalkan sisa unggahan" onPress={() => setPending(null)} />
        </Row>}
        <Row style={{ flexWrap: "wrap" }}>
          <Button
            title="Pilih foto & video"
            secondary
            disabled={action.busy || !!pending || (value.photos.length >= 10 && !!value.video_path)}
            onPress={() => void uploadGallery()}
          />
          <Button
            title="Kamera"
            secondary
            disabled={action.busy || !!pending || value.photos.length >= 10}
            onPress={() => void upload("property", true)}
          />
        </Row>
      </Card>
      <Card>
        <Title>Verifikasi properti</Title>
        <T muted>
          Unggah bukti uji kepemilikan/pengelolaan untuk ditinjau admin. Gunakan
          dokumen contoh untuk demo.
        </T>
        {!!evidence && <Photo path={evidence} />}
        <Button
          title="Pilih bukti verifikasi"
          secondary
          disabled={action.busy}
          onPress={() => void upload("verification")}
        />
        {!!old?.review_reason && <Feedback text={old.review_reason} />}
      </Card>
      <Feedback text={action.error} error />
      {edit.pending && !!action.error && <T muted>Coba simpan lagi untuk memeriksa permintaan sebelumnya. Isi permintaan sebelumnya dipertahankan sampai berhasil. Jika perlu mengganti bukti atau memperbaiki isian, buka ulang formulir setelah memastikan hasil simpan.</T>}
      <Feedback text={action.message} />
      <Button
        title={action.busy ? "Menyimpan…" : "Simpan kos"}
        disabled={action.busy || !!pending}
        onPress={() =>
          void action.run(async () => {
            if ((value.latitude !== null || value.longitude !== null) && !location)
              throw new Error("Pilih ulang titik lokasi di peta.");
            const input = {
              ...value,
              facilities: value.facilities.map((v) => v.trim()).filter(Boolean),
            };
            const id = old
              ? await edit.submit(async () => input, evidence)
              : await properties.save(input);
            if (!old && evidence) await properties.submitVerification(id, evidence);
            navigation.replace("Property", { id });
          })
        }
      />
    </Page>
  );
}
