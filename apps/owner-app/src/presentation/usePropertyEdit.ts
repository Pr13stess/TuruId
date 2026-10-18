import { useMemo } from "react";
import * as Crypto from "expo-crypto";
import { useRepositories } from "../application/RepositoriesProvider";
import { createPropertyEditSubmission } from "../domain/propertyEdit";

export function usePropertyEdit() {
  const { properties } = useRepositories();
  return useMemo(() => createPropertyEditSubmission(
    (input, id, evidence) => properties.editAndSubmit(input, id, evidence),
    () => Crypto.randomUUID(),
  ), [properties]);
}
