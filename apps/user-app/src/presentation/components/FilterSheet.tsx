import { useRef, useState } from "react";
import { View } from "react-native";
import { Text, TextInput } from "./Typography";
import type { DurationUnit, SearchQuery } from "../../domain/models";
import { defaultQuery } from "../../domain/models";
import { Chip, Button, Section } from "./Primitives";
import { Sheet } from "./Sheet";
const periods: { label: string; unit: DurationUnit; value: number }[] = [
  { label: "Harian", unit: "DAY", value: 1 },
  { label: "Mingguan", unit: "WEEK", value: 1 },
  { label: "Bulanan", unit: "MONTH", value: 1 },
  { label: "3 bulan", unit: "MONTH", value: 3 },
  { label: "6 bulan", unit: "MONTH", value: 6 },
  { label: "Tahunan", unit: "YEAR", value: 1 },
];
export function FilterSheet({
  query,
  onClose,
  onApply,
}: {
  query: SearchQuery;
  onClose: () => void;
  onApply: (q: SearchQuery) => void;
}) {
  const [draft, setDraft] = useState(query),
    [min, setMin] = useState(query.minPrice ? String(query.minPrice) : ""),
    [max, setMax] = useState(
      query.maxPrice < 1e9 ? String(query.maxPrice) : "",
    ),
    [distance, setDistance] = useState(
      query.maxDistance ? String(query.maxDistance) : "",
    ),
    [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const afterClose = useRef<(() => void) | null>(null);
  function closeThen(action: () => void) {
    if (afterClose.current) return;
    afterClose.current = action;
    setClosing(true);
  }
  function finishClose() {
    const action = afterClose.current;
    afterClose.current = null;
    action?.();
  }
  const toggle = (key: "roomFacilities" | "propertyFacilities", name: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(name)
        ? d[key].filter((x) => x !== name)
        : [...d[key], name],
    }));
  function apply() {
    const lo = Number(min || 0),
      hi = Number(max || 1e9),
      dist = distance ? Number(distance) : null;
    if (
      !Number.isFinite(lo) ||
      !Number.isFinite(hi) ||
      lo < 0 ||
      hi < lo ||
      (dist !== null && (!Number.isFinite(dist) || dist <= 0))
    ) {
      setError("Periksa rentang harga dan jarak.");
      return;
    }
    closeThen(() => onApply({
      ...draft,
      minPrice: lo,
      maxPrice: hi,
      maxDistance: draft.reference ? dist : null,
      page: 0,
    }));
  }
  return (
    <Sheet visible={!closing} title="Filter & urutkan" onClose={() => closeThen(onClose)}
      separateBackdropAnimation onAfterClose={finishClose} interactive={!closing}>
      <Section title="Filter">
        <Text className="mt-[6px] text-label font-semibold text-muted">Paket sewa</Text>
        <View className="flex-row flex-wrap gap-[8px]">
          {periods.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              selected={
                draft.durationUnit === p.unit && draft.durationValue === p.value
              }
              onPress={() =>
                setDraft({
                  ...draft,
                  durationUnit: p.unit,
                  durationValue: p.value,
                })
              }
            />
          ))}
        </View>
        <Text className="mt-[6px] text-label font-semibold text-muted">Harga per paket (Rp)</Text>
        <View className="flex-row flex-wrap gap-[8px]">
          <TextInput
            accessibilityLabel="Harga minimum"
            className="min-h-[48px] min-w-[100px] flex-1 rounded-control border border-line bg-surface p-[13px] text-body text-ink"
            keyboardType="numeric"
            placeholder="Minimum"
            value={min}
            onChangeText={setMin}
          />
          <TextInput
            accessibilityLabel="Harga maksimum"
            className="min-h-[48px] min-w-[100px] flex-1 rounded-control border border-line bg-surface p-[13px] text-body text-ink"
            keyboardType="numeric"
            placeholder="Maksimum"
            value={max}
            onChangeText={setMax}
          />
        </View>
        <Text className="mt-[6px] text-label font-semibold text-muted">Tipe kos</Text>
        <View className="flex-row flex-wrap gap-[8px]">
          {(
            [
              { id: null, label: "Semua" },
              { id: "MALE", label: "Putra" },
              { id: "FEMALE", label: "Putri" },
              { id: "MIXED", label: "Campur" },
            ] as const
          ).map((g) => (
            <Chip
              key={g.label}
              label={g.label}
              selected={draft.gender === g.id}
              onPress={() => setDraft({ ...draft, gender: g.id })}
            />
          ))}
        </View>
        <Text className="mt-[6px] text-label font-semibold text-muted">Fasilitas kamar</Text>
        <View className="flex-row flex-wrap gap-[8px]">
          {["AC", "Kamar mandi dalam", "Kasur", "Meja belajar"].map((x) => (
            <Chip
              key={x}
              label={x}
              selected={draft.roomFacilities.includes(x)}
              onPress={() => toggle("roomFacilities", x)}
            />
          ))}
        </View>
        <Text className="mt-[6px] text-label font-semibold text-muted">Fasilitas umum</Text>
        <View className="flex-row flex-wrap gap-[8px]">
          {["Wi-Fi", "Dapur bersama", "Parkir motor", "CCTV"].map((x) => (
            <Chip
              key={x}
              label={x}
              selected={draft.propertyFacilities.includes(x)}
              onPress={() => toggle("propertyFacilities", x)}
            />
          ))}
        </View>
        <Text className="mt-[6px] text-label font-semibold text-muted">Rating minimal</Text>
        <View className="flex-row flex-wrap gap-[8px]">
          {[0, 3, 4, 4.5].map((v) => (
            <Chip
              key={v}
              label={v === 0 ? "Semua" : `★ ${v}+`}
              selected={draft.minRating === v}
              onPress={() => setDraft({ ...draft, minRating: v })}
            />
          ))}
        </View>
        <Text className="mt-[6px] text-label font-semibold text-muted">Jarak maksimum (km, garis lurus)</Text>
        <TextInput
          accessibilityLabel="Jarak maksimum"
          editable={!!draft.reference}
          className={`min-h-[48px] min-w-[100px] flex-1 rounded-control border border-line bg-surface p-[13px] text-body text-ink ${!draft.reference ? "opacity-40" : ""}`}
          keyboardType="decimal-pad"
          value={distance}
          onChangeText={setDistance}
          placeholder={
            draft.reference ? "Tanpa batas" : "Pilih lokasi acuan dahulu"
          }
        />
      </Section>
      <Section title="Urutkan">
        <View className="flex-row flex-wrap gap-[8px]">
          {(
            [
              { id: "recommended", label: "Rekomendasi" },
              { id: "price", label: "Harga terendah" },
              { id: "rating", label: "Rating tertinggi" },
              { id: "nearest", label: "Terdekat" },
            ] as const
          ).map((v) => (
            <Chip
              key={v.id}
              label={v.label}
              selected={draft.sort === v.id}
              onPress={() => {
                if (v.id === "nearest" && !draft.reference) {
                  setError("Pilih lokasi acuan untuk urutan terdekat.");
                  return;
                }
                setError("");
                setDraft({ ...draft, sort: v.id });
              }}
            />
          ))}
        </View>
      </Section>
      {!!error && <Text className="text-label leading-muted text-danger">{error}</Text>}
      <Button title="Terapkan" onPress={apply} />
      <Button
        title="Reset filter"
        secondary
        onPress={() => {
          setDraft({
            ...defaultQuery,
            text: query.text,
            reference: query.reference,
          });
          setMin("");
          setMax("");
          setDistance("");
          setError("");
        }}
      />
    </Sheet>
  );
}
