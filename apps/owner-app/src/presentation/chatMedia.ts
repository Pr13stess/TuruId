import * as Picker from "expo-image-picker";
import * as Manipulator from "expo-image-manipulator";
import { imagePayload } from "../domain/chatUpload";

// Chat-only picker: keep PNG alpha until the server applies its white background.
// Property and verification photos still use the existing media.ts unchanged.
export async function chooseChatImage(camera = false) {
  const permission = camera ? await Picker.requestCameraPermissionsAsync() : await Picker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Izin kamera atau galeri diperlukan untuk memilih gambar.");
  const options = { mediaTypes: ["images"] as ("images")[], quality: 0.8 };
  const result = camera ? await Picker.launchCameraAsync(options) : await Picker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name = asset.fileName || asset.uri;
  const mime = asset.mimeType || (/\.png$/i.test(name) ? "image/png" : /\.jpe?g$/i.test(name) ? "image/jpeg" : "");
  if (mime !== "image/png" && mime !== "image/jpeg") throw new Error("Pilih gambar JPEG atau PNG.");
  const photo = await Manipulator.manipulateAsync(asset.uri,
    [{ resize: { width: Math.min(asset.width || 1200, 1600) } }],
    { compress: 0.75, format: mime === "image/png" ? Manipulator.SaveFormat.PNG : Manipulator.SaveFormat.JPEG, base64: true });
  if (!photo.base64) throw new Error("Gambar gagal diproses.");
  return imagePayload(photo.base64, mime);
}
