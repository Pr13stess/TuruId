import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyInput } from "../../domain/models";

export async function editPropertyAndSubmit(client: SupabaseClient, input: PropertyInput, requestId: string, evidence?: string): Promise<string> {
  if (!input.id) throw new Error("ID kos wajib diisi.");
  if (input.photos.length > 10) throw new Error("Galeri kos maksimal 10 foto.");
  const { data, error } = await client.rpc("owner_edit_property_and_submit", {
    input, request_id: requestId, evidence: evidence?.trim() || null,
  });
  if (error) throw new Error(error.code === "PGRST202"
    ? "Simpan dan pengajuan ulang belum diaktifkan di server. Perubahan belum disimpan."
    : error.message);
  if (data !== input.id) throw new Error("Hasil simpan belum dapat dikonfirmasi. Coba lagi.");
  return data;
}
