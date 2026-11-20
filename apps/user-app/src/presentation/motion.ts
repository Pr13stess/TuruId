import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

// Avoid motion until the device preference has been read. Share one native listener.
let reduced = true;
const listeners = new Set<() => void>();
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
let generation = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const currentGeneration = ++generation;
    let changed = false;
    const update = (value: boolean) => {
      if (currentGeneration !== generation) return;
      reduced = value;
      listeners.forEach((notify) => notify());
    };
    subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      changed = true;
      update(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!changed) update(value);
    }).catch(() => update(true));
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      generation++;
      subscription?.remove();
      subscription = undefined;
    }
  };
}

export function useMotionPreference() {
  return useSyncExternalStore(subscribe, () => reduced, () => true);
}
