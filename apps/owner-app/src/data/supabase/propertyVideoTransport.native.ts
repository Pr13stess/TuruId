import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import type { PropertyVideoInput } from "../../domain/propertyGallery";
import { nativeVideoBody, routeVideoFetch } from "./nativeVideoUpload";

export function videoUploadBody(video: PropertyVideoInput): FormData {
  return nativeVideoBody(video, uri => new File(uri));
}

export function videoUploadFetch(base: typeof fetch, url: string): typeof fetch {
  return routeVideoFetch(base, expoFetch as typeof fetch, url);
}
