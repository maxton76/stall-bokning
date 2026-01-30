"use strict";
/**
 * Routine Schedule Deleted Trigger
 *
 * Watches for deleted routineSchedules documents and removes
 * all non-completed routine instances associated with that schedule.
 * Completed and in-progress instances are preserved for history.
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRoutineScheduleDeleted = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("../lib/firebase.js");
const shared_1 = require("@equiduty/shared");
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Delete routine instances in batches
 * Only deletes instances that are not completed or in_progress
 */
async function deleteNonCompletedInstances(scheduleId, executionId) {
  const BATCH_SIZE = 500; // Firestore batch limit
  let totalDeleted = 0;
  let totalPreserved = 0;
  // Query all instances for this schedule
  const instancesSnapshot = await firebase_js_1.db
    .collection("routineInstances")
    .where("scheduleId", "==", scheduleId)
    .get();
  if (instancesSnapshot.empty) {
    firebase_functions_1.logger.info(
      { executionId, scheduleId },
      "No instances found for schedule",
    );
    return { deleted: 0, preserved: 0 };
  }
  // Separate instances by status
  const instancesToDelete = [];
  const instancesToPreserve = [];
  for (const doc of instancesSnapshot.docs) {
    const data = doc.data();
    const status = data.status;
    // Preserve completed and in_progress instances for history
    if (status === "completed" || status === "in_progress") {
      instancesToPreserve.push(doc.id);
      totalPreserved++;
    } else {
      // Delete scheduled, missed, cancelled instances
      instancesToDelete.push(doc.ref);
    }
  }
  firebase_functions_1.logger.info(
    {
      executionId,
      scheduleId,
      totalInstances: instancesSnapshot.size,
      toDelete: instancesToDelete.length,
      toPreserve: instancesToPreserve.length,
      preservedStatuses:
        instancesToPreserve.length > 0 ? "completed/in_progress" : "none",
    },
    "Categorized instances for deletion",
  );
  // Delete in batches
  for (let i = 0; i < instancesToDelete.length; i += BATCH_SIZE) {
    const batchRefs = instancesToDelete.slice(i, i + BATCH_SIZE);
    const batch = firebase_js_1.db.batch();
    for (const ref of batchRefs) {
      batch.delete(ref);
    }
    await batch.commit();
    totalDeleted += batchRefs.length;
    firebase_functions_1.logger.info(
      {
        executionId,
        scheduleId,
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        batchSize: batchRefs.length,
        totalDeleted,
      },
      "Delete batch committed",
    );
  }
  return { deleted: totalDeleted, preserved: totalPreserved };
}
// ============================================================================
// MAIN TRIGGER
// ============================================================================
/**
 * Firestore trigger for routine schedule deletion
 *
 * Removes all non-completed routine instances when a schedule is deleted.
 * Completed and in-progress instances are preserved for historical records.
 */
exports.onRoutineScheduleDeleted = (0, firestore_1.onDocumentDeleted)(
  {
    document: "routineSchedules/{scheduleId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes
  },
  async (event) => {
    const executionId = crypto.randomUUID();
    const scheduleId = event.params.scheduleId;
    if (!event.data) {
      firebase_functions_1.logger.warn(
        { executionId, scheduleId },
        "No data in schedule delete event",
      );
      return;
    }
    const deletedData = event.data.data();
    firebase_functions_1.logger.info(
      {
        executionId,
        scheduleId,
        templateId: deletedData?.templateId,
        stableId: deletedData?.stableId,
        scheduleName: deletedData?.name || deletedData?.templateName,
      },
      "Processing routine schedule deletion",
    );
    try {
      const result = await deleteNonCompletedInstances(scheduleId, executionId);
      firebase_functions_1.logger.info(
        {
          executionId,
          scheduleId,
          instancesDeleted: result.deleted,
          instancesPreserved: result.preserved,
        },
        "Routine schedule deletion cleanup complete",
      );
    } catch (error) {
      firebase_functions_1.logger.error(
        {
          executionId,
          scheduleId,
          error: (0, shared_1.formatErrorMessage)(error),
        },
        "Failed to delete routine instances",
      );
      throw error; // Trigger retry
    }
  },
);
//# sourceMappingURL=onRoutineScheduleDeleted.js.map
