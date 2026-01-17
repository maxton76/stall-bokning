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
  horseTelexId?: string;
  horseTelexUrl?: string;
}
/**
 * Full pedigree structure (3-4 generations)
 */
export interface HorsePedigree {
  sire?: PedigreeAncestor;
  dam?: PedigreeAncestor;
  sireSire?: PedigreeAncestor;
  sireDam?: PedigreeAncestor;
  damSire?: PedigreeAncestor;
  damDam?: PedigreeAncestor;
  sireSireSire?: PedigreeAncestor;
  sireSireDam?: PedigreeAncestor;
  sireDamSire?: PedigreeAncestor;
  sireDamDam?: PedigreeAncestor;
  damSireSire?: PedigreeAncestor;
  damSireDam?: PedigreeAncestor;
  damDamSire?: PedigreeAncestor;
  damDamDam?: PedigreeAncestor;
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
  includeFullPedigree?: boolean;
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
  breedConsistency: number;
  hasHorseTelexData: boolean;
}
/**
 * Helper to count recorded generations in a pedigree
 */
export declare function countPedigreeGenerations(
  pedigree: HorsePedigree,
): number;
/**
 * Helper to count total ancestors in a pedigree
 */
export declare function countPedigreeAncestors(pedigree: HorsePedigree): number;
//# sourceMappingURL=pedigree.d.ts.map
