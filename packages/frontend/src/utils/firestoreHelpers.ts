import { QuerySnapshot, DocumentData } from 'firebase/firestore'

/**
 * Map Firestore documents to typed objects with id
 */
export function mapDocsToObjects<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as T))
}

/**
 * Extract document IDs from a QuerySnapshot
 */
export function extractDocIds(snapshot: QuerySnapshot<DocumentData>): string[] {
  return snapshot.docs.map(doc => doc.id)
}
