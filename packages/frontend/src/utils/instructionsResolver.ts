import type { Horse } from "@/types/roles";
import type { RoutineCategory } from "@shared/types/routine";

/**
 * Resolves the appropriate special instructions for a horse based on the routine step category.
 * Priority: Category-specific instructions > General instructions > undefined
 *
 * @param horse - The horse object with instructions
 * @param stepCategory - The routine step category (optional)
 * @returns The resolved instructions or undefined
 */
export function getInstructionsForHorseStep(
  horse: Horse,
  stepCategory?: RoutineCategory,
): string | undefined {
  // Priority 1: Category-specific instructions if category provided
  if (stepCategory && horse.categoryInstructions?.[stepCategory]) {
    const categoryInstruction = horse.categoryInstructions[stepCategory];
    if (categoryInstruction.trim()) {
      return categoryInstruction;
    }
  }

  // Priority 2: General fallback instructions
  return horse.specialInstructions;
}

/**
 * Checks if a horse has any instructions (general or category-specific)
 */
export function hasAnyInstructions(horse: Horse): boolean {
  if (horse.specialInstructions?.trim()) return true;
  if (horse.categoryInstructions) {
    return Object.values(horse.categoryInstructions).some((instruction) =>
      instruction?.trim(),
    );
  }
  return false;
}
