import type { NoteRepository } from "../../domain/repositories/NoteRepository";
import { NoteConflictError } from "../../domain/repositories/NoteRepository";
import { NOTE_MAX_LENGTH, type Note } from "../../domain/models";
import type { AuthRepository } from "../../domain/repositories/AuthRepository";

/**
 * In-memory only, like the rest of mock/*: one note per property for
 * whoever is currently signed in, versioned the same way the Supabase
 * table is so the optimistic-lock behavior can be exercised without a
 * backend.
 */
export class MockNoteRepository implements NoteRepository {
  private readonly notes = new Map<string, Note>();
  private seq = 0;

  constructor(private readonly auth: AuthRepository) {}

  private async requireUser(): Promise<void> {
    const session = await this.auth.getSession();
    if (!session) throw new Error("Masuk terlebih dahulu untuk menulis catatan.");
  }

  async getByProperty(propertyId: string, propertyName: string) {
    await this.requireUser();
    const existing = this.notes.get(propertyId);
    if (!existing) return null;
    return { ...existing, property_name: propertyName };
  }

  async save(
    propertyId: string,
    propertyName: string,
    content: string,
    version: number | null,
  ) {
    await this.requireUser();
    if (content.length > NOTE_MAX_LENGTH)
      throw new Error(`Catatan maksimal ${NOTE_MAX_LENGTH} karakter.`);
    const existing = this.notes.get(propertyId) ?? null;
    const currentVersion = existing?.version ?? null;
    if (currentVersion !== version) throw new NoteConflictError();
    const next: Note = {
      id: existing?.id ?? `mock-note-${++this.seq}`,
      property_id: propertyId,
      property_name: propertyName,
      content,
      version: (currentVersion ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };
    this.notes.set(propertyId, next);
    return next;
  }

  async deleteByProperty(propertyId: string) {
    await this.requireUser();
    this.notes.delete(propertyId);
  }
}
