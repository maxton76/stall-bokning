import type { FeedCategory, QuantityMeasure } from "@shared/types";

export const FEED_CATEGORIES: { value: FeedCategory; label: string }[] = [
  { value: "roughage", label: "Roughage" },
  { value: "concentrate", label: "Concentrate" },
  { value: "supplement", label: "Supplement" },
  { value: "medicine", label: "Medicine" },
] as const;

export const QUANTITY_MEASURES: { value: QuantityMeasure; label: string }[] = [
  { value: "scoop", label: "Scoop" },
  { value: "teaspoon", label: "Teaspoon" },
  { value: "tablespoon", label: "Tablespoon" },
  { value: "cup", label: "Cup" },
  { value: "ml", label: "Milliliter" },
  { value: "l", label: "Liter" },
  { value: "g", label: "Gram" },
  { value: "kg", label: "Kilogram" },
  { value: "custom", label: "Custom or empty measure" },
] as const;

export const QUANTITY_MEASURE_ABBREVIATIONS: Record<QuantityMeasure, string> = {
  scoop: "scoop",
  teaspoon: "tsp",
  tablespoon: "tbsp",
  cup: "cup",
  ml: "ml",
  l: "L",
  g: "g",
  kg: "kg",
  custom: "",
};

export const FEED_CATEGORY_LABELS: Record<FeedCategory, string> = {
  roughage: "Roughage",
  concentrate: "Concentrate",
  supplement: "Supplement",
  medicine: "Medicine",
};
