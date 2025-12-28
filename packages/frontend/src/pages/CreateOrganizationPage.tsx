import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuth } from '@/contexts/AuthContext'
import { createOrganization } from '@/services/organizationService'
import type { ContactType } from '@/types/organization'

export default function CreateOrganizationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contactType: 'Business' as ContactType,
    primaryEmail: user?.email || '',
    phoneNumber: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      const organizationId = await createOrganization(user.uid, {
        name: formData.name,
        description: formData.description || undefined,
        contactType: formData.contactType,
        primaryEmail: formData.primaryEmail,
        phoneNumber: formData.phoneNumber || undefined,
        timezone: formData.timezone
      })

      console.log('Organization created with ID:', organizationId)

      // Navigate to the new organization's users page
      navigate(`/organizations/${organizationId}/users`)
    } catch (error) {
      console.error('Error creating organization:', error)
      alert('Failed to create organization. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleContactTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      contactType: value as ContactType
    }))
  }

  return (
    <div className='container mx-auto p-6 max-w-2xl'>
      {/* Header */}
      <div className='mb-6'>
        <Button
          variant='ghost'
          onClick={() => navigate('/organizations')}
          className='mb-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Organizations
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Create New Organization</h1>
        <p className='text-muted-foreground mt-1'>
          Set up your organization to manage multiple stables and team members
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>
            Provide basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Contact Type */}
            <div className='space-y-3'>
              <Label>Contact Type *</Label>
              <RadioGroup
                value={formData.contactType}
                onValueChange={handleContactTypeChange}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='Personal' id='personal' />
                  <Label htmlFor='personal' className='font-normal cursor-pointer'>
                    Personal
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='Business' id='business' />
                  <Label htmlFor='business' className='font-normal cursor-pointer'>
                    Business
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Organization Name */}
            <div className='space-y-2'>
              <Label htmlFor='name'>
                {formData.contactType === 'Business' ? 'Organization Name' : 'Name'} *
              </Label>
              <Input
                id='name'
                name='name'
                placeholder={
                  formData.contactType === 'Business'
                    ? 'e.g. Green Valley Stables Ltd'
                    : 'e.g. John Doe'
                }
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                name='description'
                placeholder='Brief description of your organization...'
                value={formData.description}
                onChange={handleChange}
                rows={4}
              />
            </div>

            {/* Primary Email */}
            <div className='space-y-2'>
              <Label htmlFor='primaryEmail'>Primary Email *</Label>
              <Input
                id='primaryEmail'
                name='primaryEmail'
                type='email'
                placeholder='contact@example.com'
                value={formData.primaryEmail}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone Number */}
            <div className='space-y-2'>
              <Label htmlFor='phoneNumber'>Phone Number</Label>
              <Input
                id='phoneNumber'
                name='phoneNumber'
                type='tel'
                placeholder='+46 70 123 45 67'
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>

            {/* Timezone */}
            <div className='space-y-2'>
              <Label htmlFor='timezone'>Timezone *</Label>
              <Input
                id='timezone'
                name='timezone'
                placeholder='e.g. Europe/Stockholm'
                value={formData.timezone}
                onChange={handleChange}
                required
              />
              <p className='text-xs text-muted-foreground'>
                Current: {formData.timezone}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className='flex gap-4 pt-4'>
              <Button type='submit' disabled={isLoading} className='flex-1'>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigate('/organizations')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
