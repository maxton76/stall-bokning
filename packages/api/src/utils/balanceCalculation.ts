/**
 * Balance Calculation Utilities
 *
 * Centralized time balance calculations for the availability system.
 * This prevents duplication across API routes and ensures consistent behavior.
 */

/**
 * Raw time balance data from Firestore
 */
export interface TimeBalanceData {
  carryoverFromPreviousYear?: number;
  buildUpHours?: number;
  corrections?: number;
  approvedLeave?: number;
  tentativeLeave?: number;
  approvedOvertime?: number;
}

/**
 * Calculated balance with projections
 */
export interface BalanceCalculation {
  currentBalance: number;
  endOfYearProjection: number;
}

/**
 * Default monthly accrual rate in hours
 * TODO: This should be configurable per organization
 */
export const DEFAULT_MONTHLY_ACCRUAL = 2.5;

/**
 * Calculate the current time balance from raw balance data
 *
 * Formula: carryover + buildUp + corrections - approvedLeave
 *
 * @param data - The raw time balance data from Firestore
 * @returns The calculated current balance in hours
 */
export function calculateCurrentBalance(data: TimeBalanceData): number {
  return (
    (data.carryoverFromPreviousYear || 0) +
    (data.buildUpHours || 0) +
    (data.corrections || 0) -
    (data.approvedLeave || 0)
  );
}

/**
 * Calculate end-of-year projection based on current balance
 * and remaining months of accrual
 *
 * @param currentBalance - The current calculated balance
 * @param referenceDate - The date to calculate from (defaults to now)
 * @param monthlyAccrual - Monthly accrual rate (defaults to 2.5 hours)
 * @returns The projected balance at end of year
 */
export function calculateEndOfYearProjection(
  currentBalance: number,
  referenceDate: Date = new Date(),
  monthlyAccrual: number = DEFAULT_MONTHLY_ACCRUAL,
): number {
  const currentMonth = referenceDate.getMonth(); // 0-11
  const remainingMonths = 11 - currentMonth;
  return currentBalance + remainingMonths * monthlyAccrual;
}

/**
 * Calculate both current balance and end-of-year projection
 *
 * @param data - The raw time balance data from Firestore
 * @param referenceDate - The date to calculate from (defaults to now)
 * @param monthlyAccrual - Monthly accrual rate (defaults to 2.5 hours)
 * @returns Object with currentBalance and endOfYearProjection
 */
export function calculateTimeBalance(
  data: TimeBalanceData,
  referenceDate: Date = new Date(),
  monthlyAccrual: number = DEFAULT_MONTHLY_ACCRUAL,
): BalanceCalculation {
  const currentBalance = calculateCurrentBalance(data);
  const endOfYearProjection = calculateEndOfYearProjection(
    currentBalance,
    referenceDate,
    monthlyAccrual,
  );

  return {
    currentBalance,
    endOfYearProjection,
  };
}

/**
 * Create a default/empty balance structure for users without existing balance records
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @param year - The balance year
 * @returns A complete balance object with all fields set to zero
 */
export function createDefaultBalance(
  userId: string,
  organizationId: string,
  year: number,
): TimeBalanceData & {
  id: string;
  userId: string;
  organizationId: string;
  year: number;
  currentBalance: number;
  endOfYearProjection: number;
} {
  return {
    id: `${userId}_${organizationId}_${year}`,
    userId,
    organizationId,
    year,
    carryoverFromPreviousYear: 0,
    buildUpHours: 0,
    corrections: 0,
    approvedLeave: 0,
    tentativeLeave: 0,
    approvedOvertime: 0,
    currentBalance: 0,
    endOfYearProjection: 0,
  };
}
