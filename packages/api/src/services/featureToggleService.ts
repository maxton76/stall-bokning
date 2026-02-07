import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { FeatureToggleMap, UpdateFeatureToggleRequest } from "@equiduty/shared";

/**
 * In-memory cache for feature toggles with TTL
 * Same pattern as tierDefaults service for consistency
 */
interface FeatureToggleCache {
  data: FeatureToggleMap | null;
  timestamp: number;
}

// Reduced TTL from 5 minutes to 30 seconds to minimize stale cache in multi-instance deployment
const CACHE_TTL_MS = parseInt(
  process.env.FEATURE_TOGGLE_CACHE_TTL || "30000",
  10,
);
const MAX_STALE_AGE = 5 * 60 * 1000; // 5 minutes max staleness
let cache: FeatureToggleCache = { data: null, timestamp: 0 };

/**
 * Check for circular dependencies in feature toggle dependency chain
 */
function hasCircularDependency(
  featureKey: string,
  dependsOn: string | undefined,
  toggles: FeatureToggleMap,
): boolean {
  if (!dependsOn) return false;

  const visited = new Set<string>();
  let current: string | undefined = dependsOn;

  while (current) {
    if (current === featureKey) return true; // Circular!
    if (visited.has(current)) break; // Already checked

    visited.add(current);
    current = toggles[current]?.dependsOn;
  }

  return false;
}

/**
 * Organization beta features cache
 */
interface OrgBetaCache {
  [orgId: string]: { betaFeatures: string[]; timestamp: number };
}

let orgCache: OrgBetaCache = {};
const MAX_ORG_CACHE_SIZE = 500; // LRU cache limit
const ORG_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Firestore document path for global feature toggles
 */
const FEATURE_TOGGLES_DOC = "featureToggles/global";

/**
 * Get all global feature toggles with caching and error handling
 */
export async function getGlobalFeatureToggles(): Promise<FeatureToggleMap> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Fetch from Firestore with error handling
  try {
    const db = getFirestore();
    const docRef = db.doc(FEATURE_TOGGLES_DOC);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn(
        "Feature toggles document not found, returning empty map. Run initialization script.",
      );
      return {};
    }

    const data = doc.data() as FeatureToggleMap;

    // Update cache
    cache = {
      data,
      timestamp: now,
    };

    return data;
  } catch (error) {
    console.error("Failed to fetch feature toggles from Firestore:", error);

    // If cache exists (even stale), return it with warning
    if (cache.data) {
      const cacheAge = now - cache.timestamp;
      if (cacheAge < MAX_STALE_AGE) {
        console.warn("Returning stale cache due to Firestore error");
        return cache.data;
      } else {
        console.error("Stale cache too old, clearing it");
        cache = { data: null, timestamp: 0 };
      }
    }

    // Otherwise return empty map (fail-open)
    console.error(
      "No cache available, returning empty map (all features enabled by default)",
    );
    return {};
  }
}

/**
 * Check if a feature is globally enabled
 */
export async function isFeatureGloballyEnabled(
  featureKey: string,
): Promise<boolean> {
  const toggles = await getGlobalFeatureToggles();
  const toggle = toggles[featureKey];

  // If toggle doesn't exist, default to enabled (backward compatibility)
  if (!toggle) {
    return true;
  }

  return toggle.enabled;
}

/**
 * Update a specific feature toggle with transaction protection
 */
export async function updateFeatureToggle(
  featureKey: string,
  update: UpdateFeatureToggleRequest,
  userId: string,
): Promise<void> {
  const db = getFirestore();
  const docRef = db.doc(FEATURE_TOGGLES_DOC);

  // Variables to capture for audit logging
  let oldEnabled: boolean | undefined;
  let oldRolloutPhase: string | undefined;
  let newEnabled: boolean | undefined;
  let newRolloutPhase: string | undefined;

  // Use transaction for concurrent update protection
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) {
      throw new Error(
        "Feature toggles document not found. Run initialization script.",
      );
    }

    const toggles = doc.data() as FeatureToggleMap;
    const existingToggle = toggles[featureKey];

    if (!existingToggle) {
      throw new Error(`Feature toggle not found: ${featureKey}`);
    }

    // Idempotency check - skip if no actual changes
    const needsUpdate =
      existingToggle.enabled !== update.enabled ||
      (update.rolloutPhase &&
        existingToggle.rolloutPhase !== update.rolloutPhase);

    if (!needsUpdate) {
      return; // No changes needed
    }

    // If disabling, check for dependent features
    if (existingToggle.enabled && !update.enabled) {
      const dependents = Object.values(toggles).filter(
        (t) => t.dependsOn === featureKey && t.enabled,
      );

      if (dependents.length > 0) {
        // Log full details server-side for debugging (internal only)
        console.warn(
          {
            featureKey,
            dependents: dependents.map((t) => ({ key: t.key, name: t.name })),
          },
          "Cannot disable - has dependencies",
        );

        // Return generic message to user (no internal details exposed)
        throw new Error("Operation not permitted");
      }
    }

    // Always check for circular dependencies when a feature has dependsOn
    if (existingToggle.dependsOn) {
      if (
        hasCircularDependency(featureKey, existingToggle.dependsOn, toggles)
      ) {
        throw new Error("Circular dependency detected");
      }
    }

    // Also check when enabling a feature with dependencies
    if (update.enabled && existingToggle.dependsOn) {
      const depToggle = toggles[existingToggle.dependsOn];
      if (!depToggle?.enabled) {
        throw new Error("Cannot enable feature: dependency is disabled");
      }
    }

    // Capture values for audit log
    oldEnabled = existingToggle.enabled;
    oldRolloutPhase = existingToggle.rolloutPhase;
    newEnabled = update.enabled;
    newRolloutPhase = update.rolloutPhase ?? existingToggle.rolloutPhase;

    // Update toggle
    const updatedToggle = {
      ...existingToggle,
      enabled: newEnabled,
      rolloutPhase: newRolloutPhase,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };

    transaction.update(docRef, {
      [featureKey]: updatedToggle,
    });
  });

  // ✅ FIX: Invalidate cache AFTER successful transaction (not before)
  cache = { data: null, timestamp: 0 };

  // Mandatory audit logging for feature toggle changes (only if changes were made)
  if (oldEnabled !== undefined && newEnabled !== undefined) {
    try {
      const db = getFirestore();
      await db.collection("auditLogs").add({
        type: "feature_toggle_update",
        featureKey,
        changes: {
          enabled: { from: oldEnabled, to: newEnabled },
          rolloutPhase: { from: oldRolloutPhase, to: newRolloutPhase },
        },
        performedBy: userId,
        timestamp: Timestamp.now(),
      });
    } catch (auditError) {
      // Log critical failure - audit logging is mandatory for compliance
      console.error("CRITICAL: Mandatory audit log failed", {
        auditError,
        featureKey,
      });

      // Fail the operation - audit logging is mandatory
      throw new Error("Operation failed: Audit logging is mandatory");
    }
  }
}

/**
 * Get organization beta features with caching
 */
async function getOrgBetaFeatures(organizationId: string): Promise<string[]> {
  const cached = orgCache[organizationId];
  const now = Date.now();

  if (cached && now - cached.timestamp < ORG_CACHE_TTL_MS) {
    return cached.betaFeatures;
  }

  try {
    const db = getFirestore();
    const orgDoc = await db
      .collection("organizations")
      .doc(organizationId)
      .get();

    if (!orgDoc.exists) {
      return [];
    }

    const betaFeatures = (orgDoc.data()?.betaFeatures as string[]) || [];
    orgCache[organizationId] = { betaFeatures, timestamp: now };
    pruneOrgCache(); // LRU eviction

    return betaFeatures;
  } catch (error) {
    console.error("Failed to fetch org beta features:", error);
    // Return cached data if available
    return cached?.betaFeatures || [];
  }
}

/**
 * Check if a feature is enabled for a specific organization
 * Resolution order:
 * 1. Check if global toggle exists
 * 2. If globally enabled → return true (subscription tier check done separately)
 * 3. If globally disabled → check if org has beta access (uses cache)
 */
export async function isFeatureEnabledForOrg(
  featureKey: string,
  organizationId: string,
): Promise<{
  enabled: boolean;
  reason: "global-enabled" | "beta-access" | "disabled" | "no-toggle";
}> {
  const toggles = await getGlobalFeatureToggles();
  const toggle = toggles[featureKey];

  // If toggle doesn't exist, default to enabled (backward compatibility)
  if (!toggle) {
    return { enabled: true, reason: "no-toggle" };
  }

  // If globally enabled, allow all orgs
  if (toggle.enabled) {
    return { enabled: true, reason: "global-enabled" };
  }

  // If globally disabled, check if org has beta access (uses cached data)
  const betaFeatures = await getOrgBetaFeatures(organizationId);

  if (betaFeatures.includes(featureKey)) {
    return { enabled: true, reason: "beta-access" };
  }

  return { enabled: false, reason: "disabled" };
}

/**
 * Debounce timer for cache invalidation
 */
let invalidationTimer: NodeJS.Timeout | null = null;

/**
 * Manually invalidate the feature toggle cache with debouncing
 * Useful for admin UI to force immediate refresh
 * Debounces multiple rapid invalidations into a single operation
 */
export function invalidateFeatureToggleCache(): void {
  if (invalidationTimer) {
    clearTimeout(invalidationTimer);
  }

  invalidationTimer = setTimeout(() => {
    cache = { data: null, timestamp: 0 };
    invalidationTimer = null;
  }, 100); // Debounce 100ms
}

/**
 * Invalidate organization beta cache for immediate policy enforcement
 * @param organizationId - Specific org to invalidate, or undefined to clear all
 */
export function invalidateOrgBetaCache(organizationId?: string): void {
  if (organizationId) {
    delete orgCache[organizationId];
  } else {
    // Clear all org caches
    Object.keys(orgCache).forEach((key) => delete orgCache[key]);
  }
}

/**
 * Prune organization cache using LRU strategy to prevent unbounded growth
 * Only prunes when threshold is exceeded to avoid unnecessary sorting
 */
function pruneOrgCache(): void {
  const currentSize = Object.keys(orgCache).length;

  // Only prune when cache exceeds threshold + buffer (avoid frequent sorting)
  if (currentSize <= MAX_ORG_CACHE_SIZE + 50) {
    return; // No pruning needed
  }

  const entries = Object.entries(orgCache)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.timestamp - a.timestamp);

  const toKeep = entries.slice(0, MAX_ORG_CACHE_SIZE);
  orgCache = Object.fromEntries(
    toKeep.map(({ id, betaFeatures, timestamp }) => [
      id,
      { betaFeatures, timestamp },
    ]),
  );
}
