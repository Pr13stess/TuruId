import type { Conversation, Message } from "../models";
export interface ChatRepository {
  syncReadReceipt(conversationId: string, userId: string): Promise<string | null>;
  chatImageUrl(path: string): Promise<import("../chatImage").ImageLease>;
  /** Membuat atau mengambil percakapan yang sudah ada untuk kos ini. */
  startConversation(
    propertyId: string,
    propertyName: string,
  ): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendText(
    conversationId: string,
    text: string,
    clientMessageId: string,
  ): Promise<Message>;
  sendImage(
    conversationId: string,
    localUri: string,
    clientMessageId: string,
    mime?: string,
  ): Promise<Message>;
  /** Berlangganan pesan baru; kembalikan fungsi untuk berhenti. */
  subscribeMessages(
    conversationId: string,
    onMessage: (message: Message) => void,
  ): () => void;
}
