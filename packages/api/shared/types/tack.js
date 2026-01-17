/**
 * Helper to get display name for a tack category
 */
export function getTackCategoryDisplayName(category, locale = "en") {
  const labels = {
    saddle: { en: "Saddle", sv: "Sadel" },
    bridle: { en: "Bridle", sv: "Huvudlag" },
    blanket: { en: "Blanket/Rug", sv: "Täcke" },
    boots: { en: "Boots", sv: "Benskydd" },
    grooming: { en: "Grooming", sv: "Ryktning" },
    halter: { en: "Halter", sv: "Grimma" },
    lunge: { en: "Lunging", sv: "Longering" },
    protective: { en: "Protective Gear", sv: "Skyddsutrustning" },
    rider: { en: "Rider Equipment", sv: "Ryttarutrustning" },
    other: { en: "Other", sv: "Övrigt" },
  };
  return labels[category]?.[locale] || category;
}
/**
 * Helper to get display name for condition
 */
export function getTackConditionDisplayName(condition, locale = "en") {
  const labels = {
    new: { en: "New", sv: "Ny" },
    excellent: { en: "Excellent", sv: "Utmärkt" },
    good: { en: "Good", sv: "Bra" },
    fair: { en: "Fair", sv: "Okej" },
    poor: { en: "Poor", sv: "Dålig" },
    needs_repair: { en: "Needs Repair", sv: "Behöver reparation" },
  };
  return labels[condition]?.[locale] || condition;
}
/**
 * Get condition color for UI
 */
export function getTackConditionColor(condition) {
  const colors = {
    new: "green",
    excellent: "green",
    good: "blue",
    fair: "yellow",
    poor: "orange",
    needs_repair: "red",
  };
  return colors[condition] || "gray";
}
