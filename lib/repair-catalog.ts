export const repairCategories = [
  { label: "Anderes", value: "other" },
  { label: "Computer und Zubehör/Handys", value: "computers_and_phones" },
  { label: "Fahrrad", value: "bicycle" },
  { label: "Foto-/Video und Autogerät", value: "photo_video_car" },
  { label: "Haushaltsgeräte", value: "household_appliances" },
  { label: "Möbel", value: "furniture" },
  { label: "Schärfen/Schleifen", value: "sharpening" },
  { label: "Schmuck/Brillen", value: "jewelry_glasses" },
  { label: "Spielzeug", value: "toys" },
  { label: "Textilien", value: "textiles" },
  { label: "Uhren", value: "watches" },
  { label: "Werkzeug", value: "tools" },
] as const;

export type RepairCategory = (typeof repairCategories)[number]["value"];
export const repairCategoryValues = repairCategories.map((item) => item.value) as RepairCategory[];

export function repairCategoryLabel(category: string) {
  return repairCategories.find((item) => item.value === category)?.label ?? category.replaceAll("_", " ");
}
