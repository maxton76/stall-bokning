import { db } from "./firebase.js";
import { DEFAULT_TIER_DEFINITIONS } from "@equiduty/shared";
import type { TierDefinition } from "@equiduty/shared";

const cache = new Map<string, { data: TierDefinition; expiry: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Deep-merge a Firestore tier document with built-in defaults so that
 * newly added fields (e.g. supportAccess, supportContacts) are always present
 * even if the Firestore document was created before those fields existed.
 */
function mergeWithDefaults(
  firestoreData: Record<string, unknown>,
  builtin: TierDefinition,
): TierDefinition {
  return {
    ...builtin,
    ...firestoreData,
    limits: { ...builtin.limits, ...((firestoreData.limits as object) ?? {}) },
    modules: {
      ...builtin.modules,
      ...((firestoreData.modules as object) ?? {}),
    },
    addons: { ...builtin.addons, ...((firestoreData.addons as object) ?? {}) },
  } as TierDefinition;
}

export async function getTierDefaults(
  tier: string,
): Promise<TierDefinition | null> {
  const cached = cache.get(tier);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const doc = await db.collection("tierDefinitions").doc(tier).get();
  const builtin = DEFAULT_TIER_DEFINITIONS[tier] ?? null;

  if (doc.exists) {
    const raw = doc.data()!;
    // Merge with built-in defaults so new fields are always present
    const data = builtin
      ? mergeWithDefaults({ ...raw, tier: doc.id }, builtin)
      : ({ ...raw, tier: doc.id } as TierDefinition);
    cache.set(tier, { data, expiry: Date.now() + TTL });
    return data;
  }

  // Boot defaults for built-in tiers
  if (builtin) {
    cache.set(tier, { data: builtin, expiry: Date.now() + TTL });
    return builtin;
  }

  return null;
}

export function invalidateTierDefaultsCache(tier?: string): void {
  if (tier) cache.delete(tier);
  else cache.clear();
}
