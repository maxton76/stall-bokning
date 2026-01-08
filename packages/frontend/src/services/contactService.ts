import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  Contact,
  CreateContactData,
  ContactDisplay
} from '@shared/types/contact'
import { mapDocsToObjects, removeUndefined } from '@/utils/firestoreHelpers'

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new contact (organization or user level)
 * @param userId - ID of user creating the contact
 * @param data - Contact data
 * @param organizationId - Organization ID (required for organization-level contacts)
 * @returns Promise with the created contact ID
 */
export async function createContact(
  userId: string,
  data: CreateContactData,
  organizationId?: string
): Promise<string> {
  const contactRef = doc(collection(db, 'contacts'))

  const baseData = {
    contactType: data.contactType,
    accessLevel: data.accessLevel,
    organizationId: data.accessLevel === 'organization' ? organizationId : null,
    userId: data.accessLevel === 'user' ? userId : null,
    email: data.email,
    phoneNumber: data.phoneNumber,
    iban: data.iban,
    invoiceLanguage: data.invoiceLanguage,
    note: data.note,
    address: data.address,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId
  }

  let contactData: any
  if (data.contactType === 'Personal') {
    contactData = {
      ...baseData,
      firstName: data.firstName,
      lastName: data.lastName,
      title: data.title,
      secondPhoneNumber: data.secondPhoneNumber,
      breedingInfo: data.breedingInfo
    }
  } else {
    contactData = {
      ...baseData,
      businessName: data.businessName,
      companyRegistrationNumber: data.companyRegistrationNumber,
      vatNumber: data.vatNumber,
      eoriNumber: data.eoriNumber,
      contactPerson: data.contactPerson
    }
  }

  await setDoc(contactRef, removeUndefined(contactData))
  return contactRef.id
}

/**
 * Get contact by ID
 * @param contactId - Contact ID
 * @returns Promise with contact data or null if not found
 */
export async function getContact(contactId: string): Promise<Contact | null> {
  const contactRef = doc(db, 'contacts', contactId)
  const contactSnap = await getDoc(contactRef)

  if (!contactSnap.exists()) return null

  return {
    id: contactSnap.id,
    ...contactSnap.data()
  } as Contact
}

/**
 * Get all contacts accessible to a user
 * Combines organization-level and user-level contacts
 * @param userId - User ID
 * @param organizationId - Organization ID (optional)
 * @returns Promise with array of contacts
 */
export async function getUserContacts(
  userId: string,
  organizationId?: string
): Promise<Contact[]> {
  const contacts: Contact[] = []

  // Get organization contacts if organizationId provided
  if (organizationId) {
    const orgContacts = await getOrganizationContacts(organizationId)
    contacts.push(...orgContacts)
  }

  // Get user's personal contacts
  const userContacts = await getUserPersonalContacts(userId)
  contacts.push(...userContacts)

  return contacts
}

/**
 * Get organization-level contacts only
 * @param organizationId - Organization ID
 * @returns Promise with array of organization contacts
 */
export async function getOrganizationContacts(
  organizationId: string
): Promise<Contact[]> {
  const q = query(
    collection(db, 'contacts'),
    where('accessLevel', '==', 'organization'),
    where('organizationId', '==', organizationId),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return mapDocsToObjects<Contact>(snapshot)
}

/**
 * Get user-level contacts only
 * @param userId - User ID
 * @returns Promise with array of user's personal contacts
 */
export async function getUserPersonalContacts(userId: string): Promise<Contact[]> {
  const q = query(
    collection(db, 'contacts'),
    where('accessLevel', '==', 'user'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return mapDocsToObjects<Contact>(snapshot)
}

/**
 * Update contact
 * @param contactId - Contact ID
 * @param userId - ID of user performing the update
 * @param updates - Partial contact data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateContact(
  contactId: string,
  userId: string,
  updates: Partial<Contact>
): Promise<void> {
  const contactRef = doc(db, 'contacts', contactId)

  const dataToUpdate = removeUndefined({
    ...updates,
    updatedAt: Timestamp.now()
  })

  await updateDoc(contactRef, dataToUpdate)
}

/**
 * Delete contact
 * @param contactId - Contact ID
 * @returns Promise that resolves when delete is complete
 */
export async function deleteContact(contactId: string): Promise<void> {
  const contactRef = doc(db, 'contacts', contactId)
  await deleteDoc(contactRef)
}

/**
 * Get contact display data for selection UI
 * @param userId - User ID
 * @param organizationId - Organization ID (optional)
 * @returns Promise with array of contact display data
 */
export async function getContactsForSelection(
  userId: string,
  organizationId?: string
): Promise<ContactDisplay[]> {
  const contacts = await getUserContacts(userId, organizationId)

  return contacts.map(contact => {
    const displayName = contact.contactType === 'Personal'
      ? `${contact.firstName} ${contact.lastName}`
      : contact.businessName

    return {
      id: contact.id,
      displayName,
      contactType: contact.contactType,
      accessLevel: contact.accessLevel,
      email: contact.email,
      city: contact.address.city,
      country: contact.address.country
    }
  })
}
