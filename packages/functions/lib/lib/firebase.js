"use strict";
/**
 * Centralized Firebase Admin SDK initialization
 *
 * This module provides a single point of Firebase initialization
 * to avoid duplication across multiple function files.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldValue = exports.Timestamp = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin if not already initialized
if ((0, app_1.getApps)().length === 0) {
  (0, app_1.initializeApp)();
}
/**
 * Get the Firestore database instance
 * Firebase Admin SDK is lazily initialized on first call
 */
exports.db = (0, firestore_1.getFirestore)();
/**
 * Re-export commonly used Firebase Admin types and functions
 * for convenience in consuming modules
 */
var firestore_2 = require("firebase-admin/firestore");
Object.defineProperty(exports, "Timestamp", {
  enumerable: true,
  get: function () {
    return firestore_2.Timestamp;
  },
});
Object.defineProperty(exports, "FieldValue", {
  enumerable: true,
  get: function () {
    return firestore_2.FieldValue;
  },
});
//# sourceMappingURL=firebase.js.map
