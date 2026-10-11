import { File } from "expo-file-system";
import { Platform } from "react-native";
import { encode } from "base64-arraybuffer";
import { imagePayload } from "../../domain/chatUpload";

export async function readChatImage(uri: string, mime?: string) {
  if (Platform.OS === "web") {
    // ImagePicker's local browser URI; never fetch a remote URL as an attachment.
    if (!uri.startsWith("blob:") && !uri.startsWith("data:image/")) throw new Error("Lokasi gambar lokal tidak valid.");
    const result = await fetch(uri);
    const blob = await result.blob();
    if (blob.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
    return imagePayload(encode(await blob.arrayBuffer()), mime || blob.type);
  }
  const file = new File(uri);
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
  // Native file reads avoid React Native fetch/blob binary conversion issues.
  return imagePayload(await file.base64(), mime);
}
