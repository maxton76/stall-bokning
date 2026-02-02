import type { Timestamp } from "firebase/firestore";

/**
 * Chargeable Item (Product/Service Catalog)
 * Defines billable products and services within an organization.
 * All monetary amounts stored in öre (1 SEK = 100 öre).
 * Stored in: chargeableItems/{id}
 */

/**
 * Unit type for pricing
 */
export type ChargeableItemUnitType =
  | "fixed"
  | "per_hour"
  | "per_session"
  | "per_quantity"
  | "per_day";

/**
 * Charge category
 */
export type ChargeableItemCategory =
  | "activity"
  | "booking"
  | "service"
  | "recurring"
  | "package";

/**
 * Swedish VAT rates
 */
export type SwedishVatRate = 25 | 12 | 6 | 0;

/**
 * Chargeable item definition
 */
export interface ChargeableItem {
  id: string;
  organizationId: string;

  /** Display name (e.g., "Hoppkurs grupplek") */
  name: string;
  /** Detailed description */
  description?: string;

  /** Pricing unit type */
  unitType: ChargeableItemUnitType;
  /** Default price per unit in öre */
  defaultUnitPrice: number;
  /** VAT rate percentage (25%, 12%, 6%, 0%) */
  vatRate: SwedishVatRate;
  /** VAT category label for reporting */
  vatCategory: string;

  /** GL/accounting code (optional for MVP1, required for exports) */
  accountingCode?: string;
  /** Cost center reference */
  costCenter?: string;

  /** Charge category */
  category: ChargeableItemCategory;
  /** Whether this item is active */
  isActive: boolean;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateChargeableItemData {
  name: string;
  description?: string;
  unitType: ChargeableItemUnitType;
  /** Price in öre */
  defaultUnitPrice: number;
  vatRate: SwedishVatRate;
  vatCategory: string;
  accountingCode?: string;
  costCenter?: string;
  category: ChargeableItemCategory;
}

export interface UpdateChargeableItemData {
  name?: string;
  description?: string;
  unitType?: ChargeableItemUnitType;
  /** Price in öre */
  defaultUnitPrice?: number;
  vatRate?: SwedishVatRate;
  vatCategory?: string;
  accountingCode?: string;
  costCenter?: string;
  category?: ChargeableItemCategory;
  isActive?: boolean;
}
