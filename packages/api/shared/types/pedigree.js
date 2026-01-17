/**
 * Helper to count recorded generations in a pedigree
 */
export function countPedigreeGenerations(pedigree) {
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
export function countPedigreeAncestors(pedigree) {
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
