import { getStableHorses } from "@/services/horseService";
import { getOrganizationHorseGroups } from "@/services/horseGroupService";
import type { Horse } from "@/types/roles";
import type { RoutineStep } from "@shared/types/routine";

/**
 * Resolves the list of horses for a routine step based on its horse context configuration
 *
 * @param step - The routine step to resolve horses for
 * @param stableId - ID of the stable
 * @param organizationId - ID of the organization
 * @returns Promise with array of horses for this step
 *
 * @example
 * // For a step with horseContext="all"
 * const horses = await resolveStepHorses(step, "stable-123", "org-456");
 * // Returns all active horses in the stable
 *
 * @example
 * // For a step with horseContext="specific" and horseFilter.horseIds
 * const horses = await resolveStepHorses(step, "stable-123", "org-456");
 * // Returns only the specified horses
 */
export async function resolveStepHorses(
  step: RoutineStep,
  stableId: string,
  organizationId: string,
): Promise<Horse[]> {
  // Handle "none" case - no horses needed for this step
  if (step.horseContext === "none") {
    return [];
  }

  // Handle "all" case - fetch all stable horses
  if (step.horseContext === "all") {
    const allHorses = await getStableHorses(stableId);

    // Apply exclusions if specified
    if (step.horseFilter?.excludeHorseIds?.length) {
      return allHorses.filter(
        (horse) => !step.horseFilter?.excludeHorseIds?.includes(horse.id),
      );
    }

    return allHorses;
  }

  // Handle "specific" case - filter by horseIds
  if (step.horseContext === "specific") {
    const allHorses = await getStableHorses(stableId);

    if (!step.horseFilter?.horseIds?.length) {
      console.warn(
        `Step "${step.name}" has horseContext="specific" but no horseIds specified`,
      );
      return [];
    }

    return allHorses.filter((horse) =>
      step.horseFilter?.horseIds?.includes(horse.id),
    );
  }

  // Handle "groups" case - fetch horses from specified groups
  if (step.horseContext === "groups") {
    if (!step.horseFilter?.groupIds?.length) {
      console.warn(
        `Step "${step.name}" has horseContext="groups" but no groupIds specified`,
      );
      return [];
    }

    const allHorses = await getStableHorses(stableId);
    const groups = await getOrganizationHorseGroups(organizationId);

    // Get all horse IDs from the specified groups
    const horseIdsInGroups = new Set<string>();
    groups
      .filter((group) => step.horseFilter?.groupIds?.includes(group.id))
      .forEach((group) => {
        // Note: HorseGroup type doesn't have horses array in the current implementation
        // This will need to be updated when horse group membership is implemented
        console.warn("Horse group membership not yet implemented");
      });

    // Filter horses by group membership
    let horses = allHorses.filter((horse) => horseIdsInGroups.has(horse.id));

    // Apply exclusions if specified
    if (step.horseFilter?.excludeHorseIds?.length) {
      horses = horses.filter(
        (horse) => !step.horseFilter?.excludeHorseIds?.includes(horse.id),
      );
    }

    return horses;
  }

  // Fallback for unknown horseContext values
  console.error(`Unknown horseContext: ${step.horseContext}`);
  return [];
}
