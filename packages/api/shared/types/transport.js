/**
 * Helper to get display name for loading behavior
 */
export function getLoadingBehaviorDisplayName(behavior, locale = "en") {
  const labels = {
    easy_loader: { en: "Easy Loader", sv: "Går på lätt" },
    needs_patience: { en: "Needs Patience", sv: "Behöver tålamod" },
    needs_handler: { en: "Needs Handler", sv: "Behöver hjälp" },
    difficult: { en: "Difficult", sv: "Svår" },
    unknown: { en: "Unknown", sv: "Okänd" },
  };
  return labels[behavior]?.[locale] || behavior;
}
/**
 * Helper to summarize transport instructions
 */
export function summarizeTransportInstructions(instructions) {
  return {
    loadingBehavior: instructions.loadingBehavior,
    hasSpecialRequirements: !!(
      instructions.sedationRequired ||
      instructions.travelAnxiety ||
      instructions.needsCompanion ||
      instructions.motionSickness ||
      (instructions.specialEquipment &&
        instructions.specialEquipment.length > 0)
    ),
    requiresSedation: !!instructions.sedationRequired,
    needsCompanion: !!instructions.needsCompanion,
    hasEmergencyContacts: !!(
      instructions.emergencyContacts &&
      instructions.emergencyContacts.length > 0
    ),
    specialEquipmentCount: instructions.specialEquipment?.length || 0,
  };
}
