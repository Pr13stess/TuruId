import { callEventDisplay } from "../../domain/callEventDisplay";

export function formatChatPreview(text: string | null) {
  if (!text) return "Mulai percakapan";
  if (!/^Panggilan (VOICE|VIDEO|suara|video)\s+[•·.]\s+/i.test(text.trim())) return text;
  const call = callEventDisplay(text.replace(/\s*\(demo\)\s*$/i, "").replace(/\s+\.\s+/g, " · "));
  return call.title === "Panggilan" ? "Riwayat panggilan" : `${call.title} · ${call.detail}`;
}

