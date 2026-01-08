import { Timestamp } from 'firebase/firestore'

/**
 * Contact access level
 */
export type ContactAccessLevel = 'organization' | 'user'

/**
 * Invoice language options
 */
export type InvoiceLanguage = 'en' | 'sv' | 'de' | 'fr' | 'nl'

/**
 * Address information shared by both contact types
 */
export interface ContactAddress {
  street: string
  houseNumber: string
  addressLine2?: string
  postcode: string
  city: string
  stateProvince?: string
  country: string
}

/**
 * Contact person information (for Business contacts)
 */
export interface ContactPerson {
  firstName: string
  lastName: string
  title?: string
  secondPhoneNumber?: string
}

/**
 * Breeding information (for Personal contacts)
 */
export interface BreedingInfo {
  studbookPreference?: string
  defaultShippingMethod?: string
  semenCollectionStation?: string
  semenCollectionStationNumber?: string
}

/**
 * Base contact interface - common fields
 */
export interface BaseContact {
  id: string
  contactType: 'Personal' | 'Business'
  accessLevel: ContactAccessLevel

  // Ownership
  organizationId?: string    // Set if accessLevel === 'organization'
  userId?: string            // Set if accessLevel === 'user'

  // Common fields
  email: string
  phoneNumber: string
  iban?: string
  invoiceLanguage: InvoiceLanguage
  note?: string
  address: ContactAddress

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string          // userId
}

/**
 * Personal contact - individual person
 */
export interface PersonalContact extends BaseContact {
  contactType: 'Personal'
  firstName: string
  lastName: string
  title?: string
  secondPhoneNumber?: string
  breedingInfo?: BreedingInfo
}

/**
 * Business contact - company/organization
 */
export interface BusinessContact extends BaseContact {
  contactType: 'Business'
  businessName: string
  companyRegistrationNumber?: string
  vatNumber?: string
  eoriNumber?: string
  contactPerson?: ContactPerson
}

/**
 * Union type for all contacts
 */
export type Contact = PersonalContact | BusinessContact

/**
 * Data for creating a new personal contact
 */
export interface CreatePersonalContactData {
  contactType: 'Personal'
  accessLevel: ContactAccessLevel
  organizationId?: string
  firstName: string
  lastName: string
  title?: string
  email: string
  phoneNumber: string
  secondPhoneNumber?: string
  iban?: string
  invoiceLanguage: InvoiceLanguage
  note?: string
  address: ContactAddress
  breedingInfo?: BreedingInfo
}

/**
 * Data for creating a new business contact
 */
export interface CreateBusinessContactData {
  contactType: 'Business'
  accessLevel: ContactAccessLevel
  organizationId?: string
  businessName: string
  email: string
  phoneNumber: string
  companyRegistrationNumber?: string
  vatNumber?: string
  iban?: string
  eoriNumber?: string
  invoiceLanguage: InvoiceLanguage
  note?: string
  contactPerson?: ContactPerson
  address: ContactAddress
}

/**
 * Union type for create data
 */
export type CreateContactData = CreatePersonalContactData | CreateBusinessContactData

/**
 * Display data for contact selection (dropdown/combobox)
 */
export interface ContactDisplay {
  id: string
  displayName: string        // "John Doe" or "ABC Company"
  contactType: 'Personal' | 'Business'
  accessLevel: ContactAccessLevel
  email: string
  city: string
  country: string
}
