import { useEffect, useState } from 'react'
import { FormSelect } from '@/components/form'
import { Button } from '@/components/ui/button'
import { getContactsForSelection } from '@/services/contactService'
import type { ContactDisplay } from '@shared/types/contact'
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'

interface ContactSelectorProps<T extends FieldValues> {
  form: UseFormReturn<T>
  name: Path<T>
  organizationId?: string
  userId: string
  label?: string
  placeholder?: string
  onCreateNew: () => void
  onContactsLoaded?: (contacts: ContactDisplay[]) => void
}

export function ContactSelector<T extends FieldValues>({
  form,
  name,
  organizationId,
  userId,
  label = 'Select Contact',
  placeholder = 'Choose a contact',
  onCreateNew,
  onContactsLoaded
}: ContactSelectorProps<T>) {
  const [contacts, setContacts] = useState<ContactDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContacts()
  }, [userId, organizationId])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await getContactsForSelection(userId, organizationId)
      setContacts(data)
      onContactsLoaded?.(data)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatContactDisplay = (contact: ContactDisplay) => {
    const accessBadge = contact.accessLevel === 'organization' ? 'Org' : 'Personal'
    return `${contact.displayName} (${contact.city}, ${contact.country}) [${accessBadge}]`
  }

  // Group contacts by access level (Organization first, then Personal)
  const orgContacts = contacts.filter(c => c.accessLevel === 'organization')
  const userContacts = contacts.filter(c => c.accessLevel === 'user')

  // Create options array with organization contacts first
  const options = [
    ...orgContacts.map(c => ({
      value: c.id,
      label: formatContactDisplay(c)
    })),
    ...userContacts.map(c => ({
      value: c.id,
      label: formatContactDisplay(c)
    }))
  ]

  return (
    <div className="space-y-2">
      <FormSelect
        form={form}
        name={name}
        label={label}
        placeholder={loading ? 'Loading contacts...' : placeholder}
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
  )
}
