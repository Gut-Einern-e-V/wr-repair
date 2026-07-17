"use client";

import { repairCategories, repairCategoryQuestions, type RepairCategory } from "@/lib/repair-catalog";

type RepairCategorySelectProps = {
  category: string;
  onChange: (category: RepairCategory) => void;
  label?: string;
};

export function RepairCategorySelect({ category, onChange, label = "Geraetekategorie" }: RepairCategorySelectProps) {
  return <label>{label}
    <select value={category} onChange={(event) => onChange(event.target.value as RepairCategory)}>
      {repairCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </label>;
}

type RepairFormFieldsProps = RepairCategorySelectProps & {
  includeQuestions?: boolean;
};

export function RepairFormFields({ category, onChange, includeQuestions = true, label }: RepairFormFieldsProps) {
  const questions = repairCategoryQuestions[category as RepairCategory] ?? [];

  return <>
    <RepairCategorySelect category={category} onChange={onChange} label={label} />
    {includeQuestions && questions.map((question) => <label key={question.id}>{question.label}
      <select name={`answer_${question.id}`} required>
        <option value="">Bitte waehlen</option>
        {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>)}
  </>;
}
