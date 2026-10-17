import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRepositories } from "../application/RepositoriesProvider";
import { useLoad } from "./hooks";

/** Refresh incoming bookings only while this screen is focused. */
export function useBookingList() {
  const { bookings } = useRepositories();
  const state = useLoad(useCallback(() => bookings.list(), [bookings]), 0, true);
  const reload = state.retry;
  useFocusEffect(useCallback(() => {
    reload();
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, [reload]));
  return state;
}
