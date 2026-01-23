import type {
  Contact,
  CreateContactData,
  ContactDisplay,
  ContactBadge,
} from "@shared/types/contact";
import { apiClient } from "@/lib/apiClient";

// Filter options for contacts
export interface ContactFilterOptions {
  organizationId?: string;
  accessLevel?: "user" | "organization";
  badge?: ContactBadge;
  hasLoginAccess?: boolean;
  search?: string;
}

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
  organizationId?: string,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>("/contacts", {
    ...data,
    organizationId,
  });

  return response.id;
}

/**
 * Get contact by ID
 * @param contactId - Contact ID
 * @returns Promise with contact data or null if not found
 */
export async function getContact(contactId: string): Promise<Contact | null> {
  try {
    return await apiClient.get<Contact & { id: string }>(
      `/contacts/${contactId}`,
    );
  } catch (error) {
    return null;
  }
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
  organizationId?: string,
): Promise<Contact[]> {
  const params: Record<string, string> = {};
  if (organizationId) {
    params.organizationId = organizationId;
  }

  const response = await apiClient.get<{ contacts: Contact[] }>(
    "/contacts",
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.contacts;
}

/**
 * Get organization-level contacts only
 * @param organizationId - Organization ID
 * @returns Promise with array of organization contacts
 */
export async function getOrganizationContacts(
  organizationId: string,
): Promise<Contact[]> {
  const response = await apiClient.get<{ contacts: Contact[] }>("/contacts", {
    organizationId,
    accessLevel: "organization",
  });

  return response.contacts;
}

/**
 * Get user-level contacts only
 * @param userId - User ID
 * @returns Promise with array of user's personal contacts
 */
export async function getUserPersonalContacts(
  userId: string,
): Promise<Contact[]> {
  const response = await apiClient.get<{ contacts: Contact[] }>("/contacts", {
    accessLevel: "user",
  });

  return response.contacts;
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
  updates: Partial<Contact>,
): Promise<void> {
  await apiClient.patch(`/contacts/${contactId}`, updates);
}

/**
 * Delete contact
 * @param contactId - Contact ID
 * @returns Promise that resolves when delete is complete
 */
export async function deleteContact(contactId: string): Promise<void> {
  await apiClient.delete(`/contacts/${contactId}`);
}

/**
 * Get contact display data for selection UI
 * @param userId - User ID
 * @param organizationId - Organization ID (optional)
 * @returns Promise with array of contact display data
 */
export async function getContactsForSelection(
  userId: string,
  organizationId?: string,
): Promise<ContactDisplay[]> {
  const contacts = await getUserContacts(userId, organizationId);

  return contacts.map((contact) => {
    const displayName =
      contact.contactType === "Personal"
        ? `${contact.firstName} ${contact.lastName}`
        : contact.businessName;

    return {
      id: contact.id,
      displayName,
      contactType: contact.contactType,
      accessLevel: contact.accessLevel,
      email: contact.email,
      city: contact.address.city,
      country: contact.address.country,
      badge: contact.badge,
      hasLoginAccess: contact.hasLoginAccess,
    };
  });
}

// ============================================================================
// Enhanced Filtering Operations
// ============================================================================

/**
 * Get contacts with advanced filtering
 * Supports badge, hasLoginAccess, and search filters
 * @param userId - User ID
 * @param options - Filter options
 * @returns Promise with array of filtered contacts
 */
export async function getFilteredContacts(
  userId: string,
  options: ContactFilterOptions = {},
): Promise<Contact[]> {
  const params: Record<string, string> = {};
  if (options.organizationId) {
    params.organizationId = options.organizationId;
  }
  if (options.accessLevel) {
    params.accessLevel = options.accessLevel;
  }
  if (options.badge) {
    params.badge = options.badge;
  }
  if (options.hasLoginAccess !== undefined) {
    params.hasLoginAccess = options.hasLoginAccess.toString();
  }
  if (options.search) {
    params.search = options.search;
  }

  const response = await apiClient.get<{ contacts: Contact[] }>(
    "/contacts",
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.contacts;
}

/**
 * Get contacts by badge type
 * @param organizationId - Organization ID
 * @param badge - Badge type to filter by
 * @returns Promise with array of contacts with the specified badge
 */
export async function getContactsByBadge(
  organizationId: string,
  badge: ContactBadge,
): Promise<Contact[]> {
  return getFilteredContacts("", {
    organizationId,
    accessLevel: "organization",
    badge,
  });
}

/**
 * Get contacts with login access
 * @param organizationId - Organization ID
 * @returns Promise with array of contacts that have login access
 */
export async function getContactsWithLoginAccess(
  organizationId: string,
): Promise<Contact[]> {
  return getFilteredContacts("", {
    organizationId,
    accessLevel: "organization",
    hasLoginAccess: true,
  });
}

/**
 * Search contacts within an organization
 * @param organizationId - Organization ID
 * @param searchQuery - Search query string
 * @returns Promise with array of matching contacts
 */
export async function searchOrganizationContacts(
  organizationId: string,
  searchQuery: string,
): Promise<Contact[]> {
  return getFilteredContacts("", {
    organizationId,
    accessLevel: "organization",
    search: searchQuery,
  });
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: Array<Contact & { matchType: "email" | "name" | "businessName" }>;
}

/**
 * Check for duplicate contacts before creating
 * @param organizationId - Organization ID
 * @param checkData - Data to check for duplicates
 * @returns Promise with duplicate check result
 */
export async function checkDuplicateContacts(
  organizationId: string,
  checkData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
  },
): Promise<DuplicateCheckResult> {
  return await apiClient.post<DuplicateCheckResult>(
    "/contacts/check-duplicate",
    { organizationId, ...checkData },
  );
}
