import type { Timestamp } from "firebase/firestore";

/**
 * Pedigree types for horse lineage tracking and HorseTelex integration
 */

/**
 * Pedigree ancestor entry
 */
export interface PedigreeAncestor {
  name: string;
  registrationNumber?: string;
  ueln?: string;
  breed?: string;
  color?: string;
  birthYear?: number;
  country?: string;

  // HorseTelex integration
  horseTelexId?: string;
  horseTelexUrl?: string;
}

/**
 * Full pedigree structure (3-4 generations)
 */
export interface HorsePedigree {
  // Generation 1 (Parents)
  sire?: PedigreeAncestor;
  dam?: PedigreeAncestor;

  // Generation 2 (Grandparents)
  sireSire?: PedigreeAncestor; // Paternal grandfather
  sireDam?: PedigreeAncestor; // Paternal grandmother
  damSire?: PedigreeAncestor; // Maternal grandfather (damsire)
  damDam?: PedigreeAncestor; // Maternal grandmother

  // Generation 3 (Great-grandparents) - Optional
  sireSireSire?: PedigreeAncestor;
  sireSireDam?: PedigreeAncestor;
  sireDamSire?: PedigreeAncestor;
  sireDamDam?: PedigreeAncestor;
  damSireSire?: PedigreeAncestor;
  damSireDam?: PedigreeAncestor;
  damDamSire?: PedigreeAncestor;
  damDamDam?: PedigreeAncestor;

  // Metadata
  importSource?: "manual" | "horsetelex" | "ueln_registry";
  importedAt?: Timestamp;
  lastVerifiedAt?: Timestamp;
}

/**
 * HorseTelex search result
 */
export interface HorseTelexSearchResult {
  horseTelexId: string;
  name: string;
  ueln?: string;
  breed?: string;
  color?: string;
  birthYear?: number;
  sire?: string;
  dam?: string;
  profileUrl: string;
}

/**
 * HorseTelex import request
 */
export interface HorseTelexImportRequest {
  horseId: string;
  horseTelexId: string;
  includeFullPedigree?: boolean; // Include 3+ generations
}

/**
 * HorseTelex import result
 */
export interface HorseTelexImportResult {
  success: boolean;
  horseId: string;
  horseTelexId: string;
  importedFields: string[];
  pedigreeGenerations?: number;
  error?: string;
}

/**
 * Pedigree statistics
 */
export interface PedigreeStats {
  generationsRecorded: number;
  totalAncestors: number;
  breedConsistency: number; // Percentage of ancestors with same breed
  hasHorseTelexData: boolean;
}

/**
 * Helper to count recorded generations in a pedigree
 */
export function countPedigreeGenerations(pedigree: HorsePedigree): number {
  if (!pedigree.sire && !pedigree.dam) return 0;

  const hasGen1 = !!(pedigree.sire || pedigree.dam);
  const hasGen2 = !!(
    pedigree.sireSire ||
    pedigree.sireDam ||
    pedigree.damSire ||
    pedigree.damDam
  );
  const hasGen3 = !!(
    pedigree.sireSireSire ||
    pedigree.sireSireDam ||
    pedigree.sireDamSire ||
    pedigree.sireDamDam ||
    pedigree.damSireSire ||
    pedigree.damSireDam ||
    pedigree.damDamSire ||
    pedigree.damDamDam
  );

  if (hasGen3) return 3;
  if (hasGen2) return 2;
  if (hasGen1) return 1;
  return 0;
}

/**
 * Helper to count total ancestors in a pedigree
 */
export function countPedigreeAncestors(pedigree: HorsePedigree): number {
  const ancestors = [
    pedigree.sire,
    pedigree.dam,
    pedigree.sireSire,
    pedigree.sireDam,
    pedigree.damSire,
    pedigree.damDam,
    pedigree.sireSireSire,
    pedigree.sireSireDam,
    pedigree.sireDamSire,
    pedigree.sireDamDam,
    pedigree.damSireSire,
    pedigree.damSireDam,
    pedigree.damDamSire,
    pedigree.damDamDam,
  ];

  return ancestors.filter((a) => a?.name).length;
}
