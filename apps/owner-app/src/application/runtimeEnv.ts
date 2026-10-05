import Constants, { ExecutionEnvironment } from "expo-constants";
/**
 * expo-notifications crashes the whole app the moment it's imported for
 * Android remote push inside Expo Go (SDK 53+); it only works in a
 * development/standalone build. Check this BEFORE ever importing
 * "expo-notifications", since even a dynamic, try/caught import still
 * triggers the crash — it throws from the module's own side-effectful
 * auto-registration code, not from anything we call.
 */
export function canUsePushNotifications(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}
