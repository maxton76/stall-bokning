import { getFirestore } from "firebase-admin/firestore";
import {
  FeatureToggle,
  FeatureToggleMap,
  UpdateFeatureToggleRequest,
} from "@equiduty/shared";

/**
 * In-memory cache for feature toggles with TTL
 * Same pattern as tierDefaults service for consistency
 */
interface FeatureToggleCache {
  data: FeatureToggleMap | null;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: FeatureToggleCache = { data: null, timestamp: 0 };

/**
 * Firestore document path for global feature toggles
 */
const FEATURE_TOGGLES_DOC = "featureToggles/global";

/**
 * Get all global feature toggles with caching
 */
export async function getGlobalFeatureToggles(): Promise<FeatureToggleMap> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Fetch from Firestore
  const db = getFirestore();
  const docRef = db.doc(FEATURE_TOGGLES_DOC);
  const doc = await docRef.get();

  if (!doc.exists) {
    console.warn(
      "Feature toggles document not found, returning empty map. Run initialization script."
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
}

/**
 * Check if a feature is globally enabled
 */
export async function isFeatureGloballyEnabled(
  featureKey: string
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
 * Update a specific feature toggle
 */
export async function updateFeatureToggle(
  featureKey: string,
  update: UpdateFeatureToggleRequest,
  userId: string
): Promise<void> {
  const db = getFirestore();
  const docRef = db.doc(FEATURE_TOGGLES_DOC);

  // Get current toggles
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error(
      "Feature toggles document not found. Run initialization script."
    );
  }

  const toggles = doc.data() as FeatureToggleMap;
  const existingToggle = toggles[featureKey];

  if (!existingToggle) {
    throw new Error(`Feature toggle not found: ${featureKey}`);
  }

  // Update toggle
  const updatedToggle: FeatureToggle = {
    ...existingToggle,
    enabled: update.enabled,
    rolloutPhase: update.rolloutPhase ?? existingToggle.rolloutPhase,
    updatedAt: new Date() as any, // Firestore will convert to Timestamp
    updatedBy: userId,
  };

  // Write to Firestore
  await docRef.update({
    [featureKey]: updatedToggle,
  });

  // Invalidate cache
  cache = { data: null, timestamp: 0 };
}

/**
 * Check if a feature is enabled for a specific organization
 * Resolution order:
 * 1. Check if global toggle exists
 * 2. If globally enabled → return true (subscription tier check done separately)
 * 3. If globally disabled → check if org has beta access
 */
export async function isFeatureEnabledForOrg(
  featureKey: string,
  organizationId: string
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

  // If globally disabled, check if org has beta access
  const db = getFirestore();
  const orgDoc = await db.collection("organizations").doc(organizationId).get();

  if (!orgDoc.exists) {
    return { enabled: false, reason: "disabled" };
  }

  const orgData = orgDoc.data();
  const betaFeatures = (orgData?.betaFeatures as string[]) || [];

  if (betaFeatures.includes(featureKey)) {
    return { enabled: true, reason: "beta-access" };
  }

  return { enabled: false, reason: "disabled" };
}

/**
 * Manually invalidate the feature toggle cache
 * Useful for admin UI to force immediate refresh
 */
export function invalidateFeatureToggleCache(): void {
  cache = { data: null, timestamp: 0 };
}
