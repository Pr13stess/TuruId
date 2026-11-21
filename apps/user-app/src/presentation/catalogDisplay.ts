/** Hide presentation-only markers from the bundled sample catalog. */
export function ownerDisplayName(name: string) {
  return name.replace(/ · Owner Demo$/, "");
}
export function propertyDisplayDescription(description: string) {
  return description.replace(/ ?Seluruh listing ini merupakan data demonstrasi\./g, "");
}
