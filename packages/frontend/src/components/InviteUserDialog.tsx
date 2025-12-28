import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { OrganizationRole } from '../../../shared/src/types/organization'

// Zod schema for form validation
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  contactType: z.enum(['Personal', 'Business']),
  roles: z.array(z.string()).min(1, 'At least one role must be selected'),
  primaryRole: z.string().min(1, 'Primary role is required'),
  showInPlanning: z.boolean().default(true),
})

type InviteUserFormData = z.infer<typeof inviteUserSchema>

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: InviteUserFormData) => Promise<void>
}

// Available organization roles
const organizationRoles: { value: OrganizationRole; label: string; description: string }[] = [
  { value: 'administrator', label: 'Administrator', description: 'Full organization access' },
  { value: 'veterinarian', label: 'Veterinarian', description: 'Animal health services' },
  { value: 'dentist', label: 'Dentist', description: 'Equine dental services' },
  { value: 'farrier', label: 'Farrier', description: 'Hoof care services' },
  { value: 'customer', label: 'Customer', description: 'Horse owner/client' },
  { value: 'groom', label: 'Groom', description: 'Daily care staff' },
  { value: 'saddle_maker', label: 'Saddle Maker', description: 'Tack and saddle services' },
  { value: 'horse_owner', label: 'Horse Owner', description: 'External horse owner' },
  { value: 'rider', label: 'Rider', description: 'Professional rider' },
  { value: 'inseminator', label: 'Inseminator', description: 'Breeding services' },
]

export function InviteUserDialog({ open, onOpenChange, onSave }: InviteUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [contactType, setContactType] = useState<'Personal' | 'Business'>('Personal')
  const [primaryRole, setPrimaryRole] = useState<string>('')
  const [showInPlanning, setShowInPlanning] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      contactType: 'Personal',
      showInPlanning: true,
      roles: [],
      primaryRole: ''
    }
  })

  const handleRoleToggle = (role: string) => {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter(r => r !== role)
      : [...selectedRoles, role]

    setSelectedRoles(newRoles)
    setValue('roles', newRoles, { shouldValidate: true })

    // If primary role is removed, clear it
    if (!newRoles.includes(primaryRole)) {
      setPrimaryRole('')
      setValue('primaryRole', '', { shouldValidate: true })
    }
  }

  const handlePrimaryRoleChange = (role: string) => {
    setPrimaryRole(role)
    setValue('primaryRole', role, { shouldValidate: true })
  }

  const onSubmit = async (data: InviteUserFormData) => {
    setLoading(true)
    try {
      await onSave(data)
      reset()
      setSelectedRoles([])
      setPrimaryRole('')
      setContactType('Personal')
      setShowInPlanning(true)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to invite user:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Invite User to Organization</DialogTitle>
          <DialogDescription>
            Invite a new member to your organization and assign their roles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* Contact Type */}
          <div className='space-y-2'>
            <Label>Contact Type</Label>
            <RadioGroup
              value={contactType}
              onValueChange={(value) => {
                setContactType(value as 'Personal' | 'Business')
                setValue('contactType', value as 'Personal' | 'Business')
              }}
              className='flex gap-4'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='Personal' id='personal' />
                <Label htmlFor='personal' className='font-normal'>Personal</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='Business' id='business' />
                <Label htmlFor='business' className='font-normal'>Business</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Email (Required) */}
          <div className='space-y-2'>
            <Label htmlFor='email'>
              Email <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='user@example.com'
              {...register('email')}
            />
            {errors.email && (
              <p className='text-sm text-destructive'>{errors.email.message}</p>
            )}
          </div>

          {/* Name Fields */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='firstName'>First Name</Label>
              <Input
                id='firstName'
                placeholder='First name'
                {...register('firstName')}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='lastName'>Last Name</Label>
              <Input
                id='lastName'
                placeholder='Last name'
                {...register('lastName')}
              />
            </div>
          </div>

          {/* Phone */}
          <div className='space-y-2'>
            <Label htmlFor='phoneNumber'>Phone Number</Label>
            <Input
              id='phoneNumber'
              type='tel'
              placeholder='+46 70 123 45 67'
              {...register('phoneNumber')}
            />
          </div>

          {/* Roles Selection */}
          <div className='space-y-3'>
            <Label>
              Roles <span className='text-destructive'>*</span>
            </Label>
            <div className='grid grid-cols-2 gap-3 border rounded-lg p-4'>
              {organizationRoles.map((role) => (
                <div key={role.value} className='flex items-start space-x-2'>
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <div className='grid gap-1'>
                    <Label
                      htmlFor={role.value}
                      className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      {role.label}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {errors.roles && (
              <p className='text-sm text-destructive'>{errors.roles.message}</p>
            )}
          </div>

          {/* Primary Role Selection */}
          {selectedRoles.length > 0 && (
            <div className='space-y-2'>
              <Label>
                Primary Role <span className='text-destructive'>*</span>
              </Label>
              <RadioGroup value={primaryRole} onValueChange={handlePrimaryRoleChange}>
                <div className='grid grid-cols-2 gap-2'>
                  {organizationRoles
                    .filter(role => selectedRoles.includes(role.value))
                    .map((role) => (
                      <div key={role.value} className='flex items-center space-x-2'>
                        <RadioGroupItem value={role.value} id={`primary-${role.value}`} />
                        <Label htmlFor={`primary-${role.value}`} className='font-normal'>
                          {role.label}
                        </Label>
                      </div>
                    ))}
                </div>
              </RadioGroup>
              {errors.primaryRole && (
                <p className='text-sm text-destructive'>{errors.primaryRole.message}</p>
              )}
            </div>
          )}

          {/* Show in Planning */}
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='showInPlanning'
              checked={showInPlanning}
              onCheckedChange={(checked) => {
                setShowInPlanning(checked as boolean)
                setValue('showInPlanning', checked as boolean)
              }}
            />
            <Label htmlFor='showInPlanning' className='font-normal'>
              Show in staff activity planning
            </Label>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
