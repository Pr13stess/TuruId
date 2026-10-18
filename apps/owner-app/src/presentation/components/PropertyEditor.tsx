import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Property, PropertyInput, Review, Room } from "../../domain/models";
import { useAction } from "../hooks";
import { usePropertyEdit } from "../usePropertyEdit";
import { PropertyGalleryEditor } from "./PropertyGalleryEditor";
import { Icon } from "./Icon";
import { RoomsInlinePanel } from "./RoomsInlinePanel";
import { ReviewReplyForm } from "./ReviewReplyForm";
import {
  Button,
  C,
  Card,
  Choices,
  date,
  Empty,
  Feedback,
  Field,
  IconButton,
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
  const edit = usePropertyEdit();
  const [tab, setTab] = useState<Tab>("profile");
  const [draft, setDraft] = useState<PropertyInput>(property);
  const [facility, setFacility] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [galleryPending, setGalleryPending] = useState(false);
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
        : { photos: draft.photos, video_path: draft.video_path };
  const save = (section: "profile" | "facilities" | "photos") =>
    void action.run(
      async () => {
        await edit.submit(async () => {
          const latest = (await properties.list()).find(
            (p) => p.id === property.id,
          );
          if (!latest) throw new Error("Properti sudah tidak dapat diakses.");
          // Capture the selected tab once, including across uncertain retries.
          return { ...latest, ...patch(section) };
        });
      },
      undefined,
      "Perubahan tersimpan dan diajukan ulang ke Admin.",
    );
  const cancel = (section: "profile" | "facilities" | "photos") => {
    setDraft((old) => ({
      ...old,
      ...(section === "profile"
        ? profileValues(property)
        : section === "facilities"
          ? { facilities: property.facilities, rules: property.rules }
          : { photos: property.photos, video_path: property.video_path }),
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
          : { photos: property.photos, video_path: property.video_path },
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
        disabled={busy || galleryPending || (!dirty(section) && !edit.pending)}
        onPress={() => save(section)}
      />
      <Button
        title="Batal perubahan"
        secondary
        disabled={busy || galleryPending || !dirty(section)}
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
          { value: "photos", label: "Galeri" },
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
        <View style={{ display: tab === "photos" ? "flex" : "none", gap: 12 }}>
          <PropertyGalleryEditor value={draft} disabled={action.busy}
            onBusyChange={setPhotoBusy}
            onPendingChange={setGalleryPending}
            onChange={gallery => setDraft(current => ({ ...current, ...gallery }))} />
          {saveButtons("photos")}
        </View>
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
      {edit.pending && !!action.error && <T muted>Coba simpan lagi untuk memeriksa permintaan sebelumnya. Isi permintaan sebelumnya dipertahankan sampai berhasil. Jika perlu mengganti bukti atau memperbaiki isian, buka ulang formulir setelah memastikan hasil simpan.</T>}
      <Feedback text={action.message} />
    </View>
  );
}
