import { useEffect, useState } from 'react'
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormSelect, FormTextarea } from '@/components/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useAuth } from '@/contexts/AuthContext'
import { createContact, updateContact } from '@/services/contactService'
import type { Contact } from '@shared/types/contact'

interface ContactFormDialogProps {
  open: boolean
  onClose: () => void
  contact?: Contact          // For editing existing contact
  organizationId?: string    // Required for organization-level contacts
  onSuccess: () => void
}

// Zod schema for contact form with discriminated union
const contactSchema = z.discriminatedUnion('contactType', [
  // Personal contact schema - Only firstName and lastName required
  z.object({
    contactType: z.literal('Personal'),
    accessLevel: z.enum(['organization', 'user']),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    title: z.string().optional(),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    phoneNumber: z.string().optional(),
    secondPhoneNumber: z.string().optional(),
    iban: z.string().optional(),
    invoiceLanguage: z.enum(['en', 'sv', 'de', 'fr', 'nl']),
    note: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      addressLine2: z.string().optional(),
      postcode: z.string().optional(),
      city: z.string().optional(),
      stateProvince: z.string().optional(),
      country: z.string().optional(),
    }),
    breedingInfo: z.object({
      studbookPreference: z.string().optional(),
      defaultShippingMethod: z.string().optional(),
      semenCollectionStation: z.string().optional(),
      semenCollectionStationNumber: z.string().optional(),
    }).optional(),
  }),

  // Business contact schema - Only businessName required
  z.object({
    contactType: z.literal('Business'),
    accessLevel: z.enum(['organization', 'user']),
    businessName: z.string().min(1, 'Business name is required'),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    phoneNumber: z.string().optional(),
    companyRegistrationNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    iban: z.string().optional(),
    eoriNumber: z.string().optional(),
    invoiceLanguage: z.enum(['en', 'sv', 'de', 'fr', 'nl']),
    note: z.string().optional(),
    contactPerson: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      title: z.string().optional(),
      secondPhoneNumber: z.string().optional(),
    }).optional(),
    address: z.object({
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      addressLine2: z.string().optional(),
      postcode: z.string().optional(),
      city: z.string().optional(),
      stateProvince: z.string().optional(),
      country: z.string().optional(),
    }),
  }),
])

type ContactFormData = z.infer<typeof contactSchema>

const INVOICE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Swedish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'nl', label: 'Dutch' },
]

export function ContactFormDialog({
  open,
  onClose,
  contact,
  organizationId,
  onSuccess
}: ContactFormDialogProps) {
  const { user } = useAuth()

  // Default values for new contacts
  const getDefaultValues = (): ContactFormData => {
    if (contact) {
      return contact as ContactFormData
    }

    // Default for new Personal contact
    return {
      contactType: 'Personal',
      accessLevel: organizationId ? 'organization' : 'user',
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phoneNumber: '',
      secondPhoneNumber: '',
      iban: '',
      invoiceLanguage: 'en',
      note: '',
      address: {
        street: '',
        houseNumber: '',
        addressLine2: '',
        postcode: '',
        city: '',
        stateProvince: '',
        country: '',
      },
      breedingInfo: {
        studbookPreference: '',
        defaultShippingMethod: '',
        semenCollectionStation: '',
        semenCollectionStationNumber: '',
      },
    } as ContactFormData
  }

  const { form, handleSubmit, resetForm } = useFormDialog<ContactFormData>({
    schema: contactSchema,
    defaultValues: getDefaultValues(),
    onSubmit: async (data) => {
      if (!user) throw new Error('User not authenticated')

      if (contact) {
        await updateContact(contact.id, user.uid, data)
      } else {
        await createContact(user.uid, data, organizationId)
      }
    },
    onSuccess: () => {
      onSuccess()
      resetForm()
    },
  })

  const contactType = form.watch('contactType')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetForm(getDefaultValues())
    }
  }, [open])

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
          resetForm()
        }
      }}
      title={contact ? 'Edit Contact' : 'New Contact'}
      description="Create or update contact information"
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Save"
      cancelLabel="Cancel"
      maxWidth="sm:max-w-[700px]"
      maxHeight="max-h-[90vh]"
    >
      <div className="grid gap-6 py-4">
        {/* Contact Type Radio Group */}
        <div className="grid gap-2">
          <Label htmlFor="contactType">Contact Type *</Label>
          <RadioGroup
            value={contactType}
            onValueChange={(value) => {
              // Reset form with new contact type default values
              const newDefaults = getDefaultValues()
              newDefaults.contactType = value as 'Personal' | 'Business'
              resetForm(newDefaults)
            }}
            disabled={!!contact} // Can't change type when editing
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Personal" id="personal" />
              <Label htmlFor="personal" className="font-normal cursor-pointer">
                Personal - Individual person
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Business" id="business" />
              <Label htmlFor="business" className="font-normal cursor-pointer">
                Business - Company/organization
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Access Level (only for new contacts from organization context) */}
        {!contact && organizationId && (
          <div className="grid gap-2">
            <Label htmlFor="accessLevel">Visibility *</Label>
            <RadioGroup
              value={form.watch('accessLevel')}
              onValueChange={(value) =>
                form.setValue('accessLevel', value as 'organization' | 'user')
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="organization" id="organization" />
                <Label htmlFor="organization" className="font-normal cursor-pointer">
                  Organization - Visible to all members
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="font-normal cursor-pointer">
                  Personal - Only visible to me
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Conditional Fields Based on Contact Type */}
        {contactType === 'Personal' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                form={form}
                name="firstName"
                label="First Name"
                placeholder="John"
                required
              />
              <FormInput
                form={form}
                name="lastName"
                label="Last Name"
                placeholder="Doe"
                required
              />
            </div>

            <FormInput
              form={form}
              name="title"
              label="Title"
              placeholder="Dr., Mr., Ms., etc."
            />
          </>
        ) : (
          <FormInput
            form={form}
            name="businessName"
            label="Business Name"
            placeholder="ABC Veterinary Clinic"
            required
          />
        )}

        {/* Common Contact Information */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            form={form}
            name="email"
            label="Email"
            type="email"
            placeholder="contact@example.com"
          />
          <FormInput
            form={form}
            name="phoneNumber"
            label="Phone Number"
            type="tel"
            placeholder="+46701234567"
          />
        </div>

        {contactType === 'Personal' && (
          <FormInput
            form={form}
            name="secondPhoneNumber"
            label="Second Phone Number"
            type="tel"
            placeholder="+46709876543"
          />
        )}

        {/* Business-Specific Fields */}
        {contactType === 'Business' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                form={form}
                name="companyRegistrationNumber"
                label="Company Registration Number"
                placeholder="556123-4567"
              />
              <FormInput
                form={form}
                name="vatNumber"
                label="VAT Number"
                placeholder="SE556123456701"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                form={form}
                name="iban"
                label="IBAN"
                placeholder="SE35 5000 0000 0549 1000 0003"
              />
              <FormInput
                form={form}
                name="eoriNumber"
                label="EORI Number"
                placeholder="SE556123456700001"
              />
            </div>
          </>
        )}

        {/* Common Fields */}
        {contactType === 'Personal' && (
          <FormInput
            form={form}
            name="iban"
            label="IBAN"
            placeholder="SE35 5000 0000 0549 1000 0003"
          />
        )}

        <FormSelect
          form={form}
          name="invoiceLanguage"
          label="Invoice Language"
          options={INVOICE_LANGUAGES}
        />

        {/* Accordion Sections */}
        <Accordion type="multiple" className="w-full">
          {/* Address Section */}
          <AccordionItem value="address">
            <AccordionTrigger>Address (Optional)</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  form={form}
                  name="address.street"
                  label="Street"
                  placeholder="Main Street"
                />
                <FormInput
                  form={form}
                  name="address.houseNumber"
                  label="House Number"
                  placeholder="123"
                />
              </div>

              <FormInput
                form={form}
                name="address.addressLine2"
                label="Address Line 2"
                placeholder="Building A, Apartment 4B"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  form={form}
                  name="address.postcode"
                  label="Postcode"
                  placeholder="12345"
                />
                <FormInput
                  form={form}
                  name="address.city"
                  label="City"
                  placeholder="Stockholm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  form={form}
                  name="address.stateProvince"
                  label="State/Province"
                  placeholder="Stockholm County"
                />
                <FormInput
                  form={form}
                  name="address.country"
                  label="Country"
                  placeholder="Sweden"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Contact Person Section (Business Only) */}
          {contactType === 'Business' && (
            <AccordionItem value="contactPerson">
              <AccordionTrigger>Contact Person (Optional)</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    form={form}
                    name="contactPerson.firstName"
                    label="First Name"
                    placeholder="Jane"
                  />
                  <FormInput
                    form={form}
                    name="contactPerson.lastName"
                    label="Last Name"
                    placeholder="Smith"
                  />
                </div>

                <FormInput
                  form={form}
                  name="contactPerson.title"
                  label="Title"
                  placeholder="Office Manager"
                />

                <FormInput
                  form={form}
                  name="contactPerson.secondPhoneNumber"
                  label="Second Phone Number"
                  type="tel"
                  placeholder="+46709876543"
                />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Breeding Info Section (Personal Only) */}
          {contactType === 'Personal' && (
            <AccordionItem value="breedingInfo">
              <AccordionTrigger>Breeding Information (Optional)</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <FormInput
                  form={form}
                  name="breedingInfo.studbookPreference"
                  label="Studbook Preference"
                  placeholder="Swedish Warmblood"
                />

                <FormInput
                  form={form}
                  name="breedingInfo.defaultShippingMethod"
                  label="Default Shipping Method"
                  placeholder="Express"
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    form={form}
                    name="breedingInfo.semenCollectionStation"
                    label="Semen Collection Station"
                    placeholder="Flyinge"
                  />
                  <FormInput
                    form={form}
                    name="breedingInfo.semenCollectionStationNumber"
                    label="Station Number"
                    placeholder="SE001"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Note */}
        <FormTextarea
          form={form}
          name="note"
          label="Note"
          placeholder="Additional information about this contact..."
          rows={3}
        />
      </div>
    </BaseFormDialog>
  )
}
