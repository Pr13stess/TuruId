import type { PropertyInput } from "../../domain/models";
import type { State } from "./seed";

type EditState = State & {
  propertyEdits?: Record<string, { payload: string; result: string }>;
  propertyProofs?: Record<string, string>;
  propertySubmissions?: { propertyId: string; evidence: string; status: "PENDING" }[];
};

export function mockEditAndSubmit(state: State, input: PropertyInput, requestId: string, evidence?: string): string {
  const s = state as EditState;
  const payload = JSON.stringify({ input, evidence: evidence?.trim() || null });
  const previous = s.propertyEdits?.[requestId];
  if (previous) {
    if (previous.payload !== payload) throw new Error("Isi percobaan berubah.");
    return previous.result;
  }
  const property = s.properties.find(p => p.id === input.id);
  if (!property) throw new Error("Kos tidak ditemukan.");
  if (["SUSPENDED", "ARCHIVED"].includes(property.publication_status)) throw new Error("Properti tidak dapat diedit.");
  const proof = evidence?.trim() || s.propertyProofs?.[input.id];
  if (!proof) throw new Error("Unggah bukti verifikasi sebelum menyimpan perubahan kos.");
  if (input.name.trim().length < 2 || input.address.trim().length < 5 || input.city.trim().length < 2 || input.photos.length > 10)
    throw new Error("Periksa nama, alamat, kota, dan jumlah foto.");
  Object.assign(property, input, { verification_status: "PENDING" });
  (s.propertyProofs ??= {})[input.id] = proof;
  (s.propertySubmissions ??= []).push({ propertyId: input.id, evidence: proof, status: "PENDING" });
  (s.propertyEdits ??= {})[requestId] = { payload, result: input.id };
  return input.id;
}

export function rememberPropertyProof(state: State, id: string, evidence: string) {
  ((state as EditState).propertyProofs ??= {})[id] = evidence;
}
