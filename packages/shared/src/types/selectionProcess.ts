import type { FirestoreTimestamp } from "./common.js";

/**
 * Selection Process Types
 * Support for turn-based routine selection where members choose shifts in order
 *
 * Note: Uses FirestoreTimestamp from common.ts for cross-SDK compatibility
 */

// ============================================================
// Selection Algorithm Types
// ============================================================

/**
 * Algorithm used to determine turn order in a selection process
 */
export type SelectionAlgorithm =
  | "manual" // Admin drag-drop (default / legacy)
  | "quota_based" // Kvotbaserat turordningsval
  | "points_balance" // Poängbalans
  | "fair_rotation"; // Rättvis rotation

/**
 * Configuration for the selection algorithm
 */
export interface SelectionAlgorithmConfig {
  algorithm: SelectionAlgorithm;
  serpentine?: boolean; // Future: serpentine order within the occasion
}

// ============================================================
// Selection Process Status Types
// ============================================================

/**
 * Status of the selection process
 */
export type SelectionProcessStatus =
  | "draft" // Process created but not started
  | "active" // Members are selecting routines
  | "completed" // All members have completed their selections
  | "cancelled"; // Process was cancelled

/**
 * Status of a turn within the selection process
 */
export type SelectionTurnStatus =
  | "pending" // Not yet this member's turn
  | "active" // Currently this member's turn to select
  | "completed"; // Member has finished their selection

// ============================================================
// Selection Process (Main Document)
// ============================================================

/**
 * Selection Process - Manages turn-based routine selection
 * Stored in: selectionProcesses/{id}
 */
export interface SelectionProcess {
  id: string;
  organizationId: string;
  stableId: string;

  // Configuration
  name: string; // e.g., "December 2024 rutinval"
  description?: string;
  selectionStartDate: FirestoreTimestamp; // Period start for selectable routines
  selectionEndDate: FirestoreTimestamp; // Period end for selectable routines

  // Turn order
  turns: SelectionProcessTurn[];
  currentTurnIndex: number; // 0-based index, -1 if not started
  currentTurnUserId: string | null; // Quick lookup for active turn

  // Algorithm
  algorithm?: SelectionAlgorithm; // undefined = legacy/manual
  quotaPerMember?: number; // Algorithm 1: calculated quota
  totalAvailablePoints?: number; // Algorithm 1: total points in period

  // Status
  status: SelectionProcessStatus;

  // Timestamps
  createdAt: FirestoreTimestamp;
  createdBy: string;
  updatedAt: FirestoreTimestamp;
  updatedBy?: string;
  startedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
}

/**
 * Individual turn within a selection process
 */
export interface SelectionProcessTurn {
  userId: string;
  userName: string;
  userEmail: string;
  order: number; // 1-based position in the queue
  status: SelectionTurnStatus;
  completedAt?: FirestoreTimestamp;
  selectionsCount: number; // Number of routines selected
}

// ============================================================
// Selection Entry (Subcollection)
// ============================================================

/**
 * Selection Entry - Records what a member selected during their turn
 * Stored in: selectionProcesses/{processId}/selections/{id}
 */
export interface SelectionEntry {
  id: string;
  routineInstanceId: string;
  selectedBy: string; // userId
  selectedByName: string;
  turnOrder: number;
  routineTemplateName: string;
  scheduledDate: FirestoreTimestamp;
  selectedAt: FirestoreTimestamp;
  pointsValue?: number; // Points value of the selected routine instance
}

// ============================================================
// API Input Types
// ============================================================

/**
 * Input for creating a selection process
 */
export interface CreateSelectionProcessInput {
  organizationId: string;
  stableId: string;
  name: string;
  description?: string;
  selectionStartDate: string; // ISO date string
  selectionEndDate: string; // ISO date string
  algorithm?: SelectionAlgorithm;
  memberOrder?: CreateSelectionProcessMember[]; // Optional when algorithm is not manual
}

/**
 * Member entry for creating a selection process
 */
export interface CreateSelectionProcessMember {
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Input for updating a selection process (only when draft)
 */
export interface UpdateSelectionProcessInput {
  name?: string;
  description?: string;
  selectionStartDate?: string;
  selectionEndDate?: string;
  memberOrder?: CreateSelectionProcessMember[];
}

/**
 * Query parameters for listing selection processes
 */
export interface ListSelectionProcessesQuery {
  stableId?: string;
  status?: SelectionProcessStatus;
  limit?: number;
  offset?: number;
}

// ============================================================
// API Response Types
// ============================================================

/**
 * Selection process with additional context for the requesting user
 */
export interface SelectionProcessWithContext extends SelectionProcess {
  // User-specific context
  isCurrentTurn: boolean; // Is it the requesting user's turn?
  userTurnOrder: number | null; // User's position in the queue (1-based)
  userTurnStatus: SelectionTurnStatus | null; // User's turn status
  turnsAhead: number; // How many people are ahead of the user

  // Selection period info
  availableRoutinesCount?: number; // Number of routines available for selection

  // Admin context
  canManage: boolean; // Can the user manage this selection process (owner/admin/schedule_planner)?
}

/**
 * Summary of a selection process for list views
 */
export interface SelectionProcessSummary {
  id: string;
  name: string;
  status: SelectionProcessStatus;
  selectionStartDate: string; // ISO date
  selectionEndDate: string; // ISO date
  totalMembers: number;
  completedTurns: number;
  currentTurnUserName: string | null;
  isCurrentTurn: boolean; // For the requesting user
  createdAt: string; // ISO date
}

// ============================================================
// Notification Types Extension
// ============================================================

/**
 * Additional notification types for selection process
 * Should be added to NotificationType in notifications.ts
 */
export type SelectionNotificationType =
  | "selection_turn_started" // "Det är din tur att välja pass"
  | "selection_process_completed"; // "Alla har valt sina pass"

// ============================================================
// Utility Types
// ============================================================

/**
 * Minimal turn info for public display (no sensitive data)
 */
export interface SelectionTurnPublicInfo {
  order: number;
  userName: string;
  status: SelectionTurnStatus;
  selectionsCount: number;
}

/**
 * Result of completing a turn
 */
export interface CompleteTurnResult {
  success: boolean;
  nextTurnUserId: string | null;
  nextTurnUserName: string | null;
  processCompleted: boolean;
}

// ============================================================
// Selection Process History (for cross-occasion rotation)
// ============================================================

/**
 * Persisted history of a completed selection process
 * Used by rotation algorithms to determine next turn order
 * Stored in: selectionProcessHistory/{id}
 */
export interface SelectionProcessHistory {
  id: string;
  organizationId: string;
  stableId: string;
  processId: string;
  processName: string;
  algorithm: SelectionAlgorithm;
  finalTurnOrder: SelectionHistoryTurn[];
  completedAt: FirestoreTimestamp;
}

/**
 * Turn record within selection process history
 */
export interface SelectionHistoryTurn {
  userId: string;
  userName: string;
  order: number; // 1-based position
  selectionsCount: number;
  totalPointsPicked: number;
}

// ============================================================
// Computed Turn Order (API response for compute-order endpoint)
// ============================================================

/**
 * Response from the compute-order endpoint
 * Frontend uses this to preview turn order before creating a process
 */
export interface ComputedTurnOrder {
  turns: CreateSelectionProcessMember[]; // Ordered list
  algorithm: SelectionAlgorithm;
  metadata: {
    quotaPerMember?: number; // Algorithm 1
    totalAvailablePoints?: number; // Algorithm 1
    previousProcessId?: string; // Used for rotation
    previousProcessName?: string;
    memberPointsMap?: Record<string, number>; // Algorithm 2: points per member
  };
}

/**
 * Input for computing turn order
 */
export interface ComputeTurnOrderInput {
  algorithm: SelectionAlgorithm;
  memberIds: string[];
  selectionStartDate: string;
  selectionEndDate: string;
}
