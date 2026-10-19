import { currentLocation } from "../domain/currentLocation";

export async function currentPropertyLocation() {
  // Load on demand so older builds can still open the map and select manually.
  const Location = await import("expo-location");
  return currentLocation({
    permission: async () => (await Location.requestForegroundPermissionsAsync()).granted,
    enabled: () => Location.hasServicesEnabledAsync(),
    position: async () => (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords,
  });
}
