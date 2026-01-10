import { useQuery } from "@tanstack/react-query";
import { FormSelect } from "@/components/form";
import { Button } from "@/components/ui/button";
import { getContactsForSelection } from "@/services/contactService";
import { queryKeys } from "@/lib/queryClient";
import type { ContactDisplay } from "@shared/types/contact";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { useEffect } from "react";

interface ContactSelectorProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  organizationId?: string;
  userId: string;
  label?: string;
  placeholder?: string;
  onCreateNew: () => void;
  onContactsLoaded?: (contacts: ContactDisplay[]) => void;
}

export function ContactSelector<T extends FieldValues>({
  form,
  name,
  organizationId,
  userId,
  label = "Select Contact",
  placeholder = "Choose a contact",
  onCreateNew,
  onContactsLoaded,
}: ContactSelectorProps<T>) {
  // Fetch contacts with TanStack Query
  const {
    data: contacts = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: queryKeys.contacts.list({ userId, organizationId }),
    queryFn: () => getContactsForSelection(userId, organizationId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle query error
  if (error) {
    console.error("Failed to load contacts:", error);
  }

  // Notify parent when contacts are loaded
  useEffect(() => {
    if (contacts.length > 0 && onContactsLoaded) {
      onContactsLoaded(contacts);
    }
  }, [contacts, onContactsLoaded]);

  const formatContactDisplay = (contact: ContactDisplay) => {
    const accessBadge =
      contact.accessLevel === "organization" ? "Org" : "Personal";
    return `${contact.displayName} (${contact.city}, ${contact.country}) [${accessBadge}]`;
  };

  // Group contacts by access level (Organization first, then Personal)
  const orgContacts = contacts.filter((c) => c.accessLevel === "organization");
  const userContacts = contacts.filter((c) => c.accessLevel === "user");

  // Create options array with organization contacts first
  const options = [
    ...orgContacts.map((c) => ({
      value: c.id,
      label: formatContactDisplay(c),
    })),
    ...userContacts.map((c) => ({
      value: c.id,
      label: formatContactDisplay(c),
    })),
  ];

  return (
    <div className="space-y-2">
      <FormSelect
        form={form}
        name={name}
        label={label}
        placeholder={loading ? "Loading contacts..." : placeholder}
        options={options}
        disabled={loading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCreateNew}
        className="w-full"
      >
        + Create new contact
      </Button>
    </div>
  );
}
