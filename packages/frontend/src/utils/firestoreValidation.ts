import { DocumentData, QuerySnapshot } from 'firebase/firestore'

export class FirestoreValidationError extends Error {
  constructor(
    message: string,
    public readonly docId: string,
    public readonly missingFields: string[]
  ) {
    super(message)
    this.name = 'FirestoreValidationError'
  }
}

interface FieldValidator<T = any> {
  required: boolean
  type?: 'string' | 'number' | 'boolean' | 'timestamp'
  enum?: T[]
  default?: T
}

type ValidationSchema<T> = {
  [K in keyof T]: FieldValidator<T[K]>
}

export function validateAndMap<T extends { id: string }>(
  docId: string,
  data: DocumentData,
  schema: ValidationSchema<Omit<T, 'id'>>,
  options: { strict?: boolean; throwOnError?: boolean } = {}
): T | null {
  const { strict = false, throwOnError = true } = options
  const missingFields: string[] = []
  const result: any = { id: docId }

  for (const [field, validator] of Object.entries(schema) as [keyof T, FieldValidator][]) {
    const value = data[field as string]

    // Check required fields
    if (validator.required && value === undefined) {
      missingFields.push(field as string)
      if (validator.default !== undefined) {
        result[field] = validator.default
      }
      continue
    }

    // Use default if value is missing
    if (value === undefined && validator.default !== undefined) {
      result[field] = validator.default
      continue
    }

    // Skip undefined non-required fields
    if (value === undefined) continue

    // Enum validation
    if (validator.enum && !validator.enum.includes(value)) {
      if (strict) {
        missingFields.push(`${field as string} (invalid enum)`)
        continue
      }
    }

    result[field] = value
  }

  // Handle validation errors
  if (missingFields.length > 0) {
    const error = new FirestoreValidationError(
      `Document ${docId} missing fields: ${missingFields.join(', ')}`,
      docId,
      missingFields
    )

    if (throwOnError) throw error

    console.warn(error.message, { docId, missingFields })
    return null
  }

  return result as T
}

export function validateAndMapDocs<T extends { id: string }>(
  snapshot: QuerySnapshot<DocumentData>,
  schema: ValidationSchema<Omit<T, 'id'>>,
  options: { strict?: boolean; throwOnError?: boolean } = {}
): T[] {
  const results: T[] = []

  for (const doc of snapshot.docs) {
    try {
      const mapped = validateAndMap<T>(doc.id, doc.data(), schema, options)
      if (mapped) results.push(mapped)
    } catch (error) {
      if (options.throwOnError) throw error
      console.error(`Skipping invalid document ${doc.id}:`, error)
    }
  }

  return results
}

// Invitation validation schema
export const INVITATION_SCHEMA: ValidationSchema<Omit<import('@/services/invitationService').Invitation, 'id'>> = {
  stableId: { required: true, type: 'string' },
  stableName: { required: true, type: 'string' },
  email: { required: true, type: 'string' },
  firstName: { required: false, type: 'string' },
  lastName: { required: false, type: 'string' },
  role: {
    required: true,
    type: 'string',
    enum: ['manager', 'member'],
    default: 'member'  // Safe default for migration
  },
  status: {
    required: true,
    type: 'string',
    enum: ['pending', 'accepted', 'declined']
  },
  createdAt: { required: true, type: 'timestamp' },
  expiresAt: { required: true, type: 'timestamp' },
  invitedBy: { required: true, type: 'string' },
  invitedByName: { required: false, type: 'string' }
}

// StableMember validation schema
export const STABLE_MEMBER_SCHEMA: ValidationSchema<Omit<import('@/types/roles').StableMember, 'id'>> = {
  stableId: { required: true, type: 'string' },
  userId: { required: true, type: 'string' },
  userEmail: { required: false, type: 'string' },
  firstName: { required: false, type: 'string' },
  lastName: { required: false, type: 'string' },
  role: {
    required: true,
    type: 'string',
    enum: ['manager', 'member']
  },
  status: {
    required: true,
    type: 'string',
    enum: ['active', 'inactive', 'pending']
  },
  joinedAt: { required: true, type: 'timestamp' },
  invitedBy: { required: false, type: 'string' },
  inviteAcceptedAt: { required: false, type: 'timestamp' }
}
