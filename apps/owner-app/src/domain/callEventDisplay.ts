export function callEventDisplay(text: string | null) {
  const match = /^Panggilan (VOICE|VIDEO|suara|video) [•·] (COMPLETED|CANCELLED|MISSED|DECLINED|FAILED|RINGING|CONNECTED)(?: [•·] (\d+) detik)?(?: \(demo\))?$/i.exec(text?.trim() ?? "");
  if (!match) return { title: "Panggilan", detail: text || "Riwayat panggilan", video: false, unsuccessful: false };
  const status = match[2].toUpperCase();
  const seconds = Number(match[3] || 0);
  const labels: Record<string, string> = {
    COMPLETED: "Selesai", CANCELLED: "Dibatalkan", MISSED: "Tidak terjawab",
    DECLINED: "Ditolak", FAILED: "Gagal tersambung", RINGING: "Memanggil", CONNECTED: "Terhubung",
  };
  const duration = seconds >= 60 ? `${Math.floor(seconds / 60)} menit${seconds % 60 ? ` ${seconds % 60} detik` : ""}` : `${seconds} detik`;
  const video = /video/i.test(match[1]);
  return { title: video ? "Panggilan video" : "Panggilan suara", video,
    detail: `${labels[status]}${status === "COMPLETED" && seconds > 0 ? ` · ${duration}` : ""}${/\(demo\)$/i.test(text || "") ? " · Demo" : ""}`,
    unsuccessful: ["MISSED", "DECLINED", "FAILED", "CANCELLED"].includes(status) };
}
