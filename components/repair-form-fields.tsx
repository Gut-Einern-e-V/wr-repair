"use client";

import { repairCategories, type RepairCategory } from "@/lib/repair-catalog";

type RepairCategorySelectProps = {
  category: string;
  onChange: (category: RepairCategory) => void;
  label?: string;
};

export function RepairCategorySelect({ category, onChange, label = "Kategorie" }: RepairCategorySelectProps) {
  return <label>{label}
    <select name="category" value={category} onChange={(event) => onChange(event.target.value as RepairCategory)}>
      {repairCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </label>;
}

