import * as Picker from "expo-image-picker";
import * as Manipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { validateGallerySelection } from "../domain/propertyGallery";

export type PickedPropertyMedia = Picker.ImagePickerAsset & { uploadId: string };
export async function choosePropertyMedia(photoCount: number, hasVideo: boolean): Promise<PickedPropertyMedia[]> {
  const result = await Picker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"], allowsMultipleSelection: true,
    selectionLimit: Math.max(1, 10 - photoCount + (hasVideo ? 0 : 1)),
    orderedSelection: true, quality: 0.8,
  });
  if (result.canceled) return [];
  validateGallerySelection(result.assets, photoCount, hasVideo);
  return result.assets.map(asset => ({ ...asset, uploadId: Crypto.randomUUID() }));
}

export async function preparePropertyPhoto(asset: PickedPropertyMedia) {
  const photo = await Manipulator.manipulateAsync(asset.uri,
    [{ resize: { width: Math.min(asset.width || 1200, 1600) } }],
    { compress: 0.75, format: Manipulator.SaveFormat.JPEG, base64: true });
  if (!photo.base64 || photo.base64.length > 6_990_508) throw new Error("Foto gagal diproses atau melebihi 5 MB.");
  return { base64: photo.base64, mime: "image/jpeg" as const, purpose: "property" as const };
}
