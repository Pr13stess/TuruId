import type { Note } from "../models";

/** Raised when the note changed since the version the caller last saw
 * (edited on another device/tab). The caller should reload and let the
 * person decide whether to overwrite or keep their edit. */
export class NoteConflictError extends Error {
  constructor() {
    super("Catatan ini sudah diperbarui di perangkat lain. Muat ulang dulu.");
    this.name = "NoteConflictError";
  }
}

export interface NoteRepository {
  /** null when the person has never written a note for this property.
   * propertyName is supplied by the caller (already on hand from the
   * property screen) rather than joined server-side, since notes does
   * not store it — it is only carried on the returned Note for display. */
  getByProperty(propertyId: string, propertyName: string): Promise<Note | null>;
  /** version is the one last loaded, or null when creating the note
   * for the first time. Throws NoteConflictError if it is stale. */
  save(
    propertyId: string,
    propertyName: string,
    content: string,
    version: number | null,
  ): Promise<Note>;
  deleteByProperty(propertyId: string): Promise<void>;
}
