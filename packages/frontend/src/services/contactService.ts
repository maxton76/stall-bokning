import type {
  Contact,
  CreateContactData,
  ContactDisplay,
} from "@shared/types/contact";

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const contactData = {
    ...data,
    organizationId,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/contacts`,
    {
      method: "POST",
      body: JSON.stringify(contactData),
    },
  );

  return response.id;
}

/**
 * Get contact by ID
 * @param contactId - Contact ID
 * @returns Promise with contact data or null if not found
 */
export async function getContact(contactId: string): Promise<Contact | null> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  try {
    const response = await authFetchJSON<Contact & { id: string }>(
      `${import.meta.env.VITE_API_URL}/api/v1/contacts/${contactId}`,
      { method: "GET" },
    );

    return response;
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams();
  if (organizationId) {
    params.append("organizationId", organizationId);
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ contacts: Contact[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/contacts${queryString}`,
    { method: "GET" },
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams({
    organizationId,
    accessLevel: "organization",
  });

  const response = await authFetchJSON<{ contacts: Contact[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/contacts?${params.toString()}`,
    { method: "GET" },
  );

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams({
    accessLevel: "user",
  });

  const response = await authFetchJSON<{ contacts: Contact[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/contacts?${params.toString()}`,
    { method: "GET" },
  );

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/contacts/${contactId}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * Delete contact
 * @param contactId - Contact ID
 * @returns Promise that resolves when delete is complete
 */
export async function deleteContact(contactId: string): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/contacts/${contactId}`,
    { method: "DELETE" },
  );
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
    };
  });
}
