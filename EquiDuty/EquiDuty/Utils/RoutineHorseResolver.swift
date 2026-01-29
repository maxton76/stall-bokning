//
//  RoutineHorseResolver.swift
//  EquiDuty
//
//  Resolves horses for routine steps based on horseContext configuration.
//  Mirrors logic from packages/frontend/src/utils/routineHorseResolver.ts
//

import Foundation

/// Resolves the list of horses for a routine step based on its horse context configuration.
///
/// - Parameters:
///   - step: The routine step to resolve horses for
///   - stableId: ID of the stable
/// - Returns: Array of horses for this step
///
/// - Example: For a step with `horseContext="all"`, returns all active horses in the stable
/// - Example: For a step with `horseContext="specific"` and `horseFilter.horseIds`, returns only the specified horses
@MainActor
func resolveStepHorses(
    step: RoutineStep,
    stableId: String
) async throws -> [Horse] {

    // Handle "none" case - no horses needed for this step
    if step.horseContext == .none {
        return []
    }

    // Handle "all" case - fetch all stable horses
    if step.horseContext == .all {
        var allHorses = try await HorseService.shared.getStableHorses(stableId: stableId)

        // Apply exclusions if specified
        if let excludeIds = step.horseFilter?.excludeHorseIds, !excludeIds.isEmpty {
            allHorses = allHorses.filter { !excludeIds.contains($0.id) }
        }

        return allHorses
    }

    // Handle "specific" case - filter by horseIds
    if step.horseContext == .specific {
        guard let horseIds = step.horseFilter?.horseIds, !horseIds.isEmpty else {
            #if DEBUG
            print("Warning: Step '\(step.name)' has horseContext='specific' but no horseIds specified")
            #endif
            return []
        }

        let allHorses = try await HorseService.shared.getStableHorses(stableId: stableId)
        return allHorses.filter { horseIds.contains($0.id) }
    }

    // Handle "groups" case - fetch horses from specified groups
    if step.horseContext == .groups {
        guard let groupIds = step.horseFilter?.groupIds, !groupIds.isEmpty else {
            #if DEBUG
            print("Warning: Step '\(step.name)' has horseContext='groups' but no groupIds specified")
            #endif
            return []
        }

        var allHorses = try await HorseService.shared.getStableHorses(stableId: stableId)

        // Filter by horse group membership
        // Horses have horseGroupId field which links them to groups
        allHorses = allHorses.filter { horse in
            guard let horseGroupId = horse.horseGroupId else { return false }
            return groupIds.contains(horseGroupId)
        }

        // Apply exclusions if specified
        if let excludeIds = step.horseFilter?.excludeHorseIds, !excludeIds.isEmpty {
            allHorses = allHorses.filter { !excludeIds.contains($0.id) }
        }

        return allHorses
    }

    // Fallback for unknown horseContext values
    #if DEBUG
    print("Error: Unknown horseContext: \(step.horseContext.rawValue)")
    #endif
    return []
}
