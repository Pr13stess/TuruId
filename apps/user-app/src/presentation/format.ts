import type { DurationUnit, Gender } from "../domain/models";
export const rupiah = (n: number) =>
  `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
export const genderLabel = (g: Gender) =>
  ({ MALE: "Putra", FEMALE: "Putri", MIXED: "Campur" })[g];
export const periodLabel = (unit: DurationUnit, value: number) =>
  `${value === 1 ? "" : `${value} `}${{ DAY: "hari", WEEK: "minggu", MONTH: "bulan", YEAR: "tahun" }[unit]}`;
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  export const dayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  export const dayLabel = (iso: string, now = new Date()) => {
    const d = new Date(iso);
    const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Kemarin";
    const base = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
    return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
};
export const distanceLabel = (n: number | null) =>
  n === null
    ? "Pilih lokasi acuan"
    : `± ${n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`} dari lokasi pilihanmu`;
