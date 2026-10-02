export const repairCategories = [
  { label: "Anderes", value: "other", labelEn: "Other" },
  { label: "Computer und Zubehör/Handys", value: "computers_and_phones", labelEn: "Computers & phones" },
  { label: "Fahrrad", value: "bicycle", labelEn: "Bikes" },
  { label: "Foto-/Video-/Audiogerät", value: "photo_video_car", labelEn: "Photo, video & audio" },
  { label: "Haushaltsgeräte", value: "household_appliances", labelEn: "Household appliances" },
  { label: "Möbel", value: "furniture", labelEn: "Furniture" },
  { label: "Schärfen/Schleifen", value: "sharpening", labelEn: "Sharpening" },
  { label: "Schmuck/Brillen", value: "jewelry_glasses", labelEn: "Jewellery & glasses" },
  { label: "Spielzeug", value: "toys", labelEn: "Toys" },
  { label: "Textilien", value: "textiles", labelEn: "Textiles" },
  { label: "Uhren", value: "watches", labelEn: "Watches & clocks" },
  { label: "Werkzeug", value: "tools", labelEn: "Tools" },
] as const;

export type RepairCategory = (typeof repairCategories)[number]["value"];
export const repairCategoryValues = repairCategories.map((item) => item.value) as RepairCategory[];

/** Englisch nur fuer die Sharepics (lib/sharepics.ts); die Website selbst ist deutsch. */
export function repairCategoryLabel(category: string, lang: "de" | "en" = "de") {
  const item = repairCategories.find((entry) => entry.value === category);
  return (lang === "en" ? item?.labelEn : item?.label) ?? category.replaceAll("_", " ");
}
