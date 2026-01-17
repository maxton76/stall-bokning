import { Timestamp } from "firebase/firestore";
/**
 * Contact access level
 */
export type ContactAccessLevel = "organization" | "user";
/**
 * Invoice language options
 */
export type InvoiceLanguage = "en" | "sv" | "de" | "fr" | "nl";
/**
 * Contact badge types for visual identification
 * - primary: Organization owner
 * - stable: Contact representing the stable/organization itself
 * - member: Active member or pending invite
 * - external: Non-member contact (horse owner, vendor, etc.)
 */
export type ContactBadge = "primary" | "stable" | "member" | "external";
/**
 * Contact source - how the contact was created
 * - manual: Created manually by user
 * - invite: Auto-created during member invitation
 * - import: Imported from external system
 * - sync: Synced from connected service
 */
export type ContactSource = "manual" | "invite" | "import" | "sync";
/**
 * Address information shared by both contact types
 */
export interface ContactAddress {
  street: string;
  houseNumber: string;
  addressLine2?: string;
  postcode: string;
  city: string;
  stateProvince?: string;
  country: string;
}
/**
 * Contact person information (for Business contacts)
 */
export interface ContactPerson {
  firstName: string;
  lastName: string;
  title?: string;
  secondPhoneNumber?: string;
}
/**
 * Breeding information (for Personal contacts)
 */
export interface BreedingInfo {
  studbookPreference?: string;
  defaultShippingMethod?: string;
  semenCollectionStation?: string;
  semenCollectionStationNumber?: string;
}
/**
 * Base contact interface - common fields
 */
export interface BaseContact {
  id: string;
  contactType: "Personal" | "Business";
  accessLevel: ContactAccessLevel;
  organizationId?: string;
  userId?: string;
  linkedMemberId?: string;
  linkedInviteId?: string;
  linkedUserId?: string;
  badge?: ContactBadge;
  source: ContactSource;
  hasLoginAccess: boolean;
  email: string;
  phoneNumber: string;
  iban?: string;
  invoiceLanguage: InvoiceLanguage;
  note?: string;
  address: ContactAddress;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
/**
 * Personal contact - individual person
 */
export interface PersonalContact extends BaseContact {
  contactType: "Personal";
  firstName: string;
  lastName: string;
  title?: string;
  secondPhoneNumber?: string;
  breedingInfo?: BreedingInfo;
}
/**
 * Business contact - company/organization
 */
export interface BusinessContact extends BaseContact {
  contactType: "Business";
  businessName: string;
  companyRegistrationNumber?: string;
  vatNumber?: string;
  eoriNumber?: string;
  contactPerson?: ContactPerson;
}
/**
 * Union type for all contacts
 */
export type Contact = PersonalContact | BusinessContact;
/**
 * Data for creating a new personal contact
 */
export interface CreatePersonalContactData {
  contactType: "Personal";
  accessLevel: ContactAccessLevel;
  organizationId?: string;
  firstName: string;
  lastName: string;
  title?: string;
  email: string;
  phoneNumber: string;
  secondPhoneNumber?: string;
  iban?: string;
  invoiceLanguage: InvoiceLanguage;
  note?: string;
  address: ContactAddress;
  breedingInfo?: BreedingInfo;
  linkedInviteId?: string;
  linkedMemberId?: string;
  linkedUserId?: string;
  source?: ContactSource;
  hasLoginAccess?: boolean;
  badge?: ContactBadge;
}
/**
 * Data for creating a new business contact
 */
export interface CreateBusinessContactData {
  contactType: "Business";
  accessLevel: ContactAccessLevel;
  organizationId?: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  companyRegistrationNumber?: string;
  vatNumber?: string;
  iban?: string;
  eoriNumber?: string;
  invoiceLanguage: InvoiceLanguage;
  note?: string;
  contactPerson?: ContactPerson;
  address: ContactAddress;
  linkedInviteId?: string;
  linkedMemberId?: string;
  linkedUserId?: string;
  source?: ContactSource;
  hasLoginAccess?: boolean;
  badge?: ContactBadge;
}
/**
 * Union type for create data
 */
export type CreateContactData =
  | CreatePersonalContactData
  | CreateBusinessContactData;
/**
 * Display data for contact selection (dropdown/combobox)
 */
export interface ContactDisplay {
  id: string;
  displayName: string;
  contactType: "Personal" | "Business";
  accessLevel: ContactAccessLevel;
  email: string;
  city: string;
  country: string;
  badge?: ContactBadge;
  hasLoginAccess: boolean;
  linkedMemberId?: string;
}
//# sourceMappingURL=contact.d.ts.map
