import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Property, PropertyInput, Review, Room } from "../../domain/models";
import { useAction } from "../hooks";
import { chooseImage } from "../media";
import { Icon } from "./Icon";
import { RoomsInlinePanel } from "./RoomsInlinePanel";
import { ReviewReplyForm } from "./ReviewReplyForm";
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
  IconButton,
  Photo,
  Row,
  Segments,
  T,
  Title,
} from "./UI";

type Tab = "profile" | "facilities" | "photos" | "reviews" | "rooms";
const profileValues = (p: PropertyInput) => ({
  name: p.name,
  address: p.address,
  city: p.city,
  province: p.province,
  gender_type: p.gender_type,
  description: p.description,
});

export function PropertyEditor({
  property,
  rooms,
  reviews,
}: {
  property: Property;
  rooms: Room[];
  reviews: Review[];
}) {
  const { properties, support } = useRepositories();
  const action = useAction();
  const [tab, setTab] = useState<Tab>("profile");
  const [draft, setDraft] = useState<PropertyInput>(property);
  const [facility, setFacility] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportCategory, setReportCategory] = useState("OTHER");
  const reportAction = useAction();
  const busy = action.busy || photoBusy;
  const set = <K extends keyof PropertyInput>(
    key: K,
    value: PropertyInput[K],
  ) => setDraft((old) => ({ ...old, [key]: value }));
  const patch = (section: "profile" | "facilities" | "photos") =>
    section === "profile"
      ? profileValues(draft)
      : section === "facilities"
        ? { facilities: draft.facilities, rules: draft.rules }
        : { photos: draft.photos };
  const save = (section: "profile" | "facilities" | "photos") =>
    void action.run(
      async () => {
        const latest = (await properties.list()).find(
          (p) => p.id === property.id,
        );
        if (!latest) throw new Error("Properti sudah tidak dapat diakses.");
        // Save only the selected tab so other local drafts and latest stored fields survive.
        await properties.save({ ...latest, ...patch(section) });
      },
      undefined,
      "Perubahan tersimpan.",
    );
  const cancel = (section: "profile" | "facilities" | "photos") => {
    setDraft((old) => ({
      ...old,
      ...(section === "profile"
        ? profileValues(property)
        : section === "facilities"
          ? { facilities: property.facilities, rules: property.rules }
          : { photos: property.photos }),
    }));
    setLocalError("");
    if (section === "facilities") setFacility("");
  };
  const dirty = (section: "profile" | "facilities" | "photos") =>
    JSON.stringify(patch(section)) !==
    JSON.stringify(
      section === "profile"
        ? profileValues(property)
        : section === "facilities"
          ? { facilities: property.facilities, rules: property.rules }
          : { photos: property.photos },
    );
  const saveButtons = (section: "profile" | "facilities" | "photos") => (
    <View style={{ gap: 10 }}>
      {dirty(section) && (
        <T style={{ fontSize: 11, color: C.orangeDark }}>
          Ada perubahan yang belum disimpan.
        </T>
      )}
      <Button
        title={action.busy ? "Menyimpan…" : "Simpan perubahan"}
        disabled={busy || !dirty(section)}
        onPress={() => save(section)}
      />
      <Button
        title="Batal perubahan"
        secondary
        disabled={busy || !dirty(section)}
        onPress={() => cancel(section)}
      />
    </View>
  );
  const addFacility = () => {
    const value = facility.trim();
    if (!value) {
      setLocalError("Masukkan nama fasilitas terlebih dahulu.");
      return;
    }
    if (draft.facilities.some((f) => f.toLowerCase() === value.toLowerCase())) {
      setLocalError("Fasilitas tersebut sudah ada.");
      return;
    }
    setDraft((old) => ({ ...old, facilities: [...old.facilities, value] }));
    setFacility("");
    setLocalError("");
  };
  const upload = async (camera = false) => {
    if (busy) return;
    setPhotoBusy(true);
    setLocalError("");
    try {
      const image = await chooseImage(camera);
      if (!image) return;
      const path = await support.upload({ ...image, purpose: "property" });
      setDraft((old) => ({ ...old, photos: [...old.photos, path] }));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhotoBusy(false);
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <Segments
        scrollable
        value={tab}
        onChange={(value) => {
          setTab(value);
          setLocalError("");
        }}
        options={[
          { value: "profile", label: "Profil" },
          { value: "facilities", label: "Fasilitas" },
          { value: "photos", label: "Photo" },
          { value: "reviews", label: "Ulasan" },
          { value: "rooms", label: "Tipe kamar" },
        ]}
      />
      <View pointerEvents={busy ? "none" : "auto"} style={{ gap: 18 }}>
        {tab === "profile" && (
          <>
            <Field
              label="Nama kos"
              value={draft.name}
              onChange={(v) => set("name", v)}
              disabled={busy}
            />
            <Field
              label="Alamat"
              value={draft.address}
              onChange={(v) => set("address", v)}
              multiline
              disabled={busy}
            />
            <Field
              label="Kota"
              value={draft.city}
              onChange={(v) => set("city", v)}
              disabled={busy}
            />
            <Field
              label="Provinsi"
              value={draft.province}
              onChange={(v) => set("province", v)}
              disabled={busy}
            />
            <Choices
              label="Tipe kos"
              value={draft.gender_type}
              onChange={(v) => set("gender_type", v)}
              options={[
                { value: "MALE", label: "Putra" },
                { value: "FEMALE", label: "Putri" },
                { value: "MIXED", label: "Campuran" },
              ]}
            />
            <Row style={{ alignItems: "stretch" }}>
              <Card style={{ flex: 1, backgroundColor: C.soft }}>
                <T muted style={{ fontSize: 11 }}>
                  Jumlah tipe kamar
                </T>
                <T style={{ fontWeight: "800" }}>{rooms.length}</T>
              </Card>
              <Card style={{ flex: 1, backgroundColor: C.soft }}>
                <T muted style={{ fontSize: 11 }}>
                  Jumlah total kamar
                </T>
                <T style={{ fontWeight: "800" }}>
                  {rooms.reduce((n, r) => n + r.inventory.total, 0)}
                </T>
              </Card>
            </Row>
            <Field
              label="Deskripsi kos"
              value={draft.description}
              onChange={(v) => set("description", v)}
              multiline
              disabled={busy}
            />
            <T muted style={{ fontSize: 11 }}>
              Jumlah kamar dihitung dari tab Tipe kamar. Informasi yang disimpan
              mengikuti pemeriksaan ulang properti.
            </T>
            {saveButtons("profile")}
          </>
        )}
        {tab === "facilities" && (
          <>
            <Title>Fasilitas umum</Title>
            <View style={{ gap: 9 }}>
              {draft.facilities.map((value, i) => (
                <Row
                  key={`${value}-${i}`}
                  style={{
                    backgroundColor: C.soft,
                    paddingLeft: 14,
                    paddingRight: 3,
                    borderRadius: 12,
                  }}
                >
                  <Icon name="check" size={18} color={C.orange} />
                  <T style={{ flex: 1, fontSize: 13 }}>{value}</T>
                  <IconButton
                    name="close"
                    label={`Hapus fasilitas ${value}`}
                    color={C.red}
                    onPress={() =>
                      set(
                        "facilities",
                        draft.facilities.filter((_, n) => n !== i),
                      )
                    }
                  />
                </Row>
              ))}
            </View>
            {!draft.facilities.length && (
              <T muted>Fasilitas belum ditambahkan.</T>
            )}
            <Field
              label="Fasilitas baru"
              value={facility}
              onChange={setFacility}
              placeholder="Contoh: Laundry"
              disabled={busy}
            />
            <Button
              title="+ Tambah fasilitas"
              secondary
              onPress={addFacility}
              disabled={busy}
            />
            <Field
              label="Peraturan kos"
              value={draft.rules}
              onChange={(v) => set("rules", v)}
              multiline
              disabled={busy}
            />
            {saveButtons("facilities")}
          </>
        )}
        {tab === "photos" && (
          <>
            <Row>
              <Title>Galeri kos</Title>
              <Badge>{draft.photos.length} foto</Badge>
            </Row>
            <Row style={{ alignItems: "stretch" }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={photoBusy ? "Mengunggah…" : "+ Tambah foto"}
                  onPress={() => void upload()}
                  disabled={busy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Kamera"
                  secondary
                  onPress={() => void upload(true)}
                  disabled={busy}
                />
              </View>
            </Row>
            {draft.photos.map((path, i) => (
              <Card key={`${path}-${i}`} style={{ padding: 10 }}>
                <Photo path={path} height={195} />
                <Row>
                  <T muted style={{ fontSize: 11 }}>
                    {i === 0 ? "Foto sampul" : `Foto ${i + 1}`}
                  </T>
                  <IconButton
                    name="close"
                    label={`Hapus foto ${i + 1}`}
                    color={C.red}
                    onPress={() =>
                      set(
                        "photos",
                        draft.photos.filter((_, n) => n !== i),
                      )
                    }
                  />
                </Row>
                {i > 0 && (
                  <Button
                    title={`Jadikan foto ${i + 1} sampul`}
                    secondary
                    onPress={() =>
                      set("photos", [
                        path,
                        ...draft.photos.filter((_, n) => n !== i),
                      ])
                    }
                  />
                )}
              </Card>
            ))}
            {!draft.photos.length && (
              <Empty
                title="Belum ada foto"
                body="Tambahkan foto dari galeri atau kamera."
              />
            )}
            {saveButtons("photos")}
          </>
        )}
      </View>
      {tab === "reviews" && (
        <View style={{ gap: 16 }}>
          <T muted style={{ fontSize: 12 }}>
            Ulasan ditulis oleh penyewa. Laporkan ulasan yang tidak sesuai untuk
            ditinjau.
          </T>
          {reviews.length > 0 && (
            <Card style={{ backgroundColor: C.peach, alignItems: "center" }}>
              <T
                style={{
                  fontSize: 30,
                  lineHeight: 36,
                  fontWeight: "800",
                  color: C.orangeDark,
                }}
              >
                ★{" "}
                {(
                  reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
                ).toFixed(1)}
              </T>
              <T muted>{reviews.length} ulasan penyewa</T>
            </Card>
          )}
          {reviews.map((review) => (
            <Card key={review.id}>
              <Row>
                <T style={{ fontWeight: "700", flex: 1 }}>{review.tenant}</T>
                <T style={{ color: C.orangeDark }}>★ {review.rating}/5</T>
              </Row>
              <T>{review.review_text}</T>
              <ReviewReplyForm key={review.id} review={review} />
              <T muted style={{ fontSize: 11 }}>
                {date(review.created_at)}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Laporkan ulasan ${review.tenant}`}
                style={{ minHeight: 44, justifyContent: "center" }}
                onPress={() => {
                  setReporting(reporting === review.id ? null : review.id);
                  setReportText("");
                }}
              >
                <T style={{ fontSize: 12, color: C.orangeDark }}>
                  Laporkan ulasan →
                </T>
              </Pressable>
              {reporting === review.id && (
                <View style={{ gap: 12 }}>
                  <Choices
                    label="Kategori laporan"
                    value={reportCategory}
                    onChange={setReportCategory}
                    options={[
                      { value: "SPAM", label: "Spam" },
                      { value: "HARASSMENT", label: "Mengganggu" },
                      { value: "FALSE_INFORMATION", label: "Informasi palsu" },
                      { value: "OTHER", label: "Lainnya" },
                    ]}
                  />
                  <Field
                    label="Alasan laporan"
                    value={reportText}
                    onChange={setReportText}
                    multiline
                    disabled={reportAction.busy}
                  />
                  <Feedback text={reportAction.error} error />
                  <Button
                    title="Kirim laporan ulasan"
                    disabled={reportAction.busy || !reportText.trim()}
                    onPress={() =>
                      void reportAction.run(
                        () =>
                          support.report({
                            target_type: "REVIEW",
                            target_id: review.id,
                            category: reportCategory,
                            description: reportText,
                            evidence_path: "",
                          }),
                        () => setReporting(null),
                        "Laporan ulasan dikirim.",
                      )
                    }
                  />
                  <Button
                    title="Batal laporan"
                    secondary
                    disabled={reportAction.busy}
                    onPress={() => setReporting(null)}
                  />
                </View>
              )}
            </Card>
          ))}
          <Feedback text={reportAction.message} />
          {!reviews.length && (
            <Empty
              title="Belum ada ulasan"
              body="Ulasan penyewa akan tampil di sini setelah disetujui."
            />
          )}
        </View>
      )}
      <View style={{ display: tab === "rooms" ? "flex" : "none" }}>
        <RoomsInlinePanel propertyId={property.id} rooms={rooms} />
      </View>
      <Feedback text={localError} error />
      <Feedback text={action.error} error />
      <Feedback text={action.message} />
    </View>
  );
}
