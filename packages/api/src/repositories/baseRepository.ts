/**
 * Base Repository Pattern
 *
 * Centralized data access layer for Firestore collections.
 * Eliminates 311+ direct db.collection() calls across routes.
 *
 * @example
 * ```typescript
 * // Create a typed repository
 * const feedTypeRepo = createRepository<FeedType>('feedTypes');
 *
 * // Standard CRUD operations
 * const feedType = await feedTypeRepo.findById('abc123');
 * const feedTypes = await feedTypeRepo.findByField('stableId', 'stable-1');
 * const id = await feedTypeRepo.create(data, userId);
 * await feedTypeRepo.update('abc123', updates, userId);
 * await feedTypeRepo.delete('abc123');
 *
 * // Advanced queries
 * const results = await feedTypeRepo.findMany({
 *   where: [{ field: 'stableId', op: '==', value: 'stable-1' }],
 *   orderBy: [{ field: 'name', direction: 'asc' }],
 *   limit: 10,
 * });
 * ```
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { serializeTimestamps } from "../utils/serialization.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Base entity type with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  createdBy?: string;
  lastModifiedBy?: string;
}

/**
 * Where clause for queries
 */
export interface WhereClause {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
}

/**
 * Order by clause for queries
 */
export interface OrderByClause {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Query options for findMany
 */
export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
}

/**
 * Repository interface defining standard CRUD operations
 */
export interface Repository<T extends BaseEntity> {
  /**
   * Collection name in Firestore
   */
  collectionName: string;

  /**
   * Find a document by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find documents by a field value
   */
  findByField(field: string, value: unknown): Promise<T[]>;

  /**
   * Find documents with advanced query options
   */
  findMany(options?: QueryOptions): Promise<T[]>;

  /**
   * Find one document matching conditions
   */
  findOne(options: QueryOptions): Promise<T | null>;

  /**
   * Check if a document exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Create a new document
   */
  create(
    data: Omit<T, "id" | "createdAt" | "updatedAt">,
    userId?: string,
  ): Promise<string>;

  /**
   * Update an existing document
   */
  update(id: string, data: Partial<T>, userId?: string): Promise<void>;

  /**
   * Delete a document
   */
  delete(id: string): Promise<void>;

  /**
   * Soft delete a document (set isActive to false)
   */
  softDelete(id: string, userId?: string): Promise<void>;

  /**
   * Count documents matching conditions
   */
  count(options?: QueryOptions): Promise<number>;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a typed repository for a Firestore collection
 *
 * @param collectionName - Name of the Firestore collection
 * @returns Repository instance with CRUD operations
 */
export function createRepository<T extends BaseEntity>(
  collectionName: string,
): Repository<T> {
  const collection = db.collection(collectionName);

  /**
   * Build a Firestore query from QueryOptions
   */
  function buildQuery(
    options?: QueryOptions,
  ): FirebaseFirestore.Query<FirebaseFirestore.DocumentData> {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      collection;

    if (options?.where) {
      for (const clause of options.where) {
        query = query.where(clause.field, clause.op, clause.value);
      }
    }

    if (options?.orderBy) {
      for (const clause of options.orderBy) {
        query = query.orderBy(clause.field, clause.direction);
      }
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  /**
   * Convert a Firestore document to entity with serialized timestamps
   */
  function docToEntity(
    doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  ): T {
    return serializeTimestamps({
      id: doc.id,
      ...doc.data(),
    }) as T;
  }

  return {
    collectionName,

    async findById(id: string): Promise<T | null> {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return docToEntity(doc);
    },

    async findByField(field: string, value: unknown): Promise<T[]> {
      const snapshot = await collection.where(field, "==", value).get();
      return snapshot.docs.map(docToEntity);
    },

    async findMany(options?: QueryOptions): Promise<T[]> {
      const query = buildQuery(options);
      const snapshot = await query.get();
      return snapshot.docs.map(docToEntity);
    },

    async findOne(options: QueryOptions): Promise<T | null> {
      const results = await this.findMany({ ...options, limit: 1 });
      return results[0] || null;
    },

    async exists(id: string): Promise<boolean> {
      const doc = await collection.doc(id).get();
      return doc.exists;
    },

    async create(
      data: Omit<T, "id" | "createdAt" | "updatedAt">,
      userId?: string,
    ): Promise<string> {
      const docData: Record<string, unknown> = {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (userId) {
        docData.createdBy = userId;
        docData.lastModifiedBy = userId;
      }

      const docRef = await collection.add(docData);
      return docRef.id;
    },

    async update(id: string, data: Partial<T>, userId?: string): Promise<void> {
      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;

      if (userId) {
        updateData.lastModifiedBy = userId;
      }

      await collection.doc(id).update(updateData);
    },

    async delete(id: string): Promise<void> {
      await collection.doc(id).delete();
    },

    async softDelete(id: string, userId?: string): Promise<void> {
      const updateData: Record<string, unknown> = {
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (userId) {
        updateData.lastModifiedBy = userId;
      }

      await collection.doc(id).update(updateData);
    },

    async count(options?: QueryOptions): Promise<number> {
      const query = buildQuery(options);
      const snapshot = await query.count().get();
      return snapshot.data().count;
    },
  };
}

// =============================================================================
// Specialized Repository Helpers
// =============================================================================

/**
 * Create a repository with stable-scoped helpers
 */
export function createStableRepository<
  T extends BaseEntity & { stableId: string },
>(collectionName: string) {
  const base = createRepository<T>(collectionName);

  return {
    ...base,

    /**
     * Find all documents for a stable
     */
    async findByStable(stableId: string, activeOnly = true): Promise<T[]> {
      const where: WhereClause[] = [
        { field: "stableId", op: "==", value: stableId },
      ];

      if (activeOnly) {
        where.push({ field: "isActive", op: "==", value: true });
      }

      return base.findMany({ where });
    },

    /**
     * Find active documents for a stable, ordered by name
     */
    async findByStableOrdered(
      stableId: string,
      orderField = "name",
      direction: "asc" | "desc" = "asc",
    ): Promise<T[]> {
      return base.findMany({
        where: [
          { field: "stableId", op: "==", value: stableId },
          { field: "isActive", op: "==", value: true },
        ],
        orderBy: [{ field: orderField, direction }],
      });
    },
  };
}

/**
 * Create a repository with organization-scoped helpers
 */
export function createOrganizationRepository<
  T extends BaseEntity & { organizationId: string },
>(collectionName: string) {
  const base = createRepository<T>(collectionName);

  return {
    ...base,

    /**
     * Find all documents for an organization
     */
    async findByOrganization(
      organizationId: string,
      activeOnly = true,
    ): Promise<T[]> {
      const where: WhereClause[] = [
        { field: "organizationId", op: "==", value: organizationId },
      ];

      if (activeOnly) {
        where.push({ field: "isActive", op: "==", value: true });
      }

      return base.findMany({ where });
    },
  };
}

// =============================================================================
// Batch Operations Helper
// =============================================================================

/**
 * Helper for batch write operations
 */
export function createBatch() {
  return db.batch();
}

/**
 * Run multiple operations in a transaction
 */
export async function runTransaction<T>(
  fn: (transaction: FirebaseFirestore.Transaction) => Promise<T>,
): Promise<T> {
  return db.runTransaction(fn);
}

/**
 * Get a reference to a document for transaction/batch operations
 */
export function getDocRef(collectionName: string, docId: string) {
  return db.collection(collectionName).doc(docId);
}
