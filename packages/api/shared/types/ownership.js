/**
 * Helper function to validate ownership percentages
 */
export function validateOwnershipPercentages(ownerships) {
  const activeOwnerships = ownerships.filter((o) => !o.endDate);
  const totalPercentage = activeOwnerships.reduce(
    (sum, o) => sum + o.percentage,
    0,
  );
  const errors = [];
  const warnings = [];
  if (totalPercentage > 100) {
    errors.push(
      `Total ownership percentage (${totalPercentage}%) exceeds 100%`,
    );
  }
  if (totalPercentage < 100 && totalPercentage > 0) {
    warnings.push(
      `Total ownership percentage (${totalPercentage}%) is less than 100%`,
    );
  }
  activeOwnerships.forEach((o) => {
    if (o.percentage <= 0) {
      errors.push("Ownership percentage must be greater than 0");
    }
    if (o.percentage > 100) {
      errors.push("Individual ownership percentage cannot exceed 100%");
    }
  });
  return {
    isValid: errors.length === 0,
    totalPercentage,
    errors,
    warnings,
  };
}
