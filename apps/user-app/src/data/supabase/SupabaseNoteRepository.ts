import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteRepository } from "../../domain/repositories/NoteRepository";
import { NoteConflictError } from "../../domain/repositories/NoteRepository";
import type { Note } from "../../domain/models";

interface NoteRow {
  id: string;
  property_id: string;
  content: string;
  version: number;
  updated_at: string;
}
function toNote(row: NoteRow, propertyName: string): Note {
  return {
    id: row.id,
    property_id: row.property_id,
    property_name: propertyName,
    content: row.content,
    version: row.version,
    updated_at: row.updated_at,
  };
}

export class SupabaseNoteRepository implements NoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async currentUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user)
      throw new Error("Masuk terlebih dahulu untuk menulis catatan.");
    return data.user.id;
  }

  async getByProperty(propertyId: string, propertyName: string) {
    const { data, error } = await this.client
      .from("notes")
      .select("id, property_id, content, version, updated_at")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toNote(data as NoteRow, propertyName) : null;
  }

  async save(
    propertyId: string,
    propertyName: string,
    content: string,
    version: number | null,
  ) {
    if (version === null) {
      const userId = await this.currentUserId();
      const { data, error } = await this.client
        .from("notes")
        .insert({ user_id: userId, property_id: propertyId, content })
        .select("id, property_id, content, version, updated_at")
        .single();
      if (error) {
        // Someone else already created a note for this property on
        // another device between load and save (unique(user_id,property_id)).
        if (error.code === "23505") throw new NoteConflictError();
        throw new Error(error.message);
      }
      return toNote(data as NoteRow, propertyName);
    }
    // version bump is server-side (trg_notes_bump_version), so only the
    // WHERE filter below needs it: 0 rows matched means it is stale.
    const { data, error } = await this.client
      .from("notes")
      .update({ content })
      .eq("property_id", propertyId)
      .eq("version", version)
      .select("id, property_id, content, version, updated_at");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new NoteConflictError();
    return toNote(data[0] as NoteRow, propertyName);
  }

  async deleteByProperty(propertyId: string) {
    const { error } = await this.client
      .from("notes")
      .delete()
      .eq("property_id", propertyId);
    if (error) throw new Error(error.message);
  }
}
