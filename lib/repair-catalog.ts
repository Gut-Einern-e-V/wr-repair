export const repairCategories = [
  { label: "Elektrogeräte", value: "electrical_appliances" },
  { label: "Haushaltsgeräte", value: "household_appliances" },
  { label: "Computer & Kommunikation", value: "computers_and_communication" },
  { label: "Fahrräder", value: "bicycles" },
  { label: "Möbel", value: "furniture" },
  { label: "Textilien & Kleidung", value: "textiles_and_clothing" },
  { label: "Werkzeuge", value: "tools" },
  { label: "Spielzeug & Freizeit", value: "toys_and_leisure" },
  { label: "Sonstiges", value: "other" },
] as const;

export type RepairCategory = (typeof repairCategories)[number]["value"];
export const repairCategoryValues = repairCategories.map((item) => item.value) as RepairCategory[];

export const repairCategoryQuestions: Record<RepairCategory, { id: string; label: string; options: string[] }[]> = {
  electrical_appliances: [{ id: "device", label: "Was fuer ein Elektrogeraet?", options: ["Kleingeraet", "Audio oder Video", "Lampe", "Anderes"] }],
  household_appliances: [{ id: "device", label: "Welches Haushaltsgeraet?", options: ["Kueche", "Waschen", "Reinigen", "Anderes"] }],
  computers_and_communication: [{ id: "device", label: "Welches Geraet?", options: ["Computer", "Smartphone", "Netzwerk", "Anderes"] }],
  bicycles: [{ id: "repair", label: "Was wurde repariert?", options: ["Bremse", "Antrieb", "Reifen", "Anderes"] }],
  furniture: [{ id: "material", label: "Woraus besteht das Moebel?", options: ["Holz", "Metall", "Kunststoff", "Anderes"] }],
  textiles_and_clothing: [{ id: "repair", label: "Welche Reparatur war es?", options: ["Naht", "Flicken", "Reissverschluss", "Anderes"] }],
  tools: [{ id: "tool", label: "Welches Werkzeug?", options: ["Elektrowerkzeug", "Handwerkzeug", "Gartengeraet", "Anderes"] }],
  toys_and_leisure: [{ id: "item", label: "Was wurde repariert?", options: ["Spielzeug", "Sport", "Musik", "Anderes"] }],
  other: [{ id: "item", label: "Was wurde repariert?", options: ["Alltagsgegenstand", "Dekoration", "Anderes", "Sonstiges"] }],
};

export function repairCategoryLabel(category: string) {
  return repairCategories.find((item) => item.value === category)?.label ?? category.replaceAll("_", " ");
}
