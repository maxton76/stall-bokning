/**
 * Helper to get display name for a team role
 */
export function getTeamRoleDisplayName(role, locale = "en") {
  const labels = {
    rider: { en: "Rider", sv: "Ryttare" },
    groom: { en: "Groom", sv: "Skötare" },
    farrier: { en: "Farrier", sv: "Hovslagare" },
    veterinarian: { en: "Veterinarian", sv: "Veterinär" },
    trainer: { en: "Trainer", sv: "Tränare" },
    dentist: { en: "Equine Dentist", sv: "Tandvårdare" },
    physiotherapist: { en: "Physiotherapist", sv: "Fysioterapeut" },
    saddler: { en: "Saddler", sv: "Sadelmakare" },
    other: { en: "Other", sv: "Annan" },
  };
  return labels[role]?.[locale] || role;
}
/**
 * Get icon name for a team role (for UI)
 */
export function getTeamRoleIcon(role) {
  const icons = {
    rider: "user",
    groom: "brush",
    farrier: "hammer",
    veterinarian: "stethoscope",
    trainer: "graduation-cap",
    dentist: "smile",
    physiotherapist: "activity",
    saddler: "briefcase",
    other: "user-plus",
  };
  return icons[role] || "user";
}
