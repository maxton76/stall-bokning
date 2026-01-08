import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { createStable } from '@/services/stableService'

export default function CreateStablePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const organizationId = searchParams.get('organizationId')

  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postalCode: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      // Create stable with optional organizationId
      const stableData = {
        name: formData.name,
        description: formData.description,
        address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
        ownerId: user.uid,
        ownerEmail: user.email || undefined,
        ...(organizationId && { organizationId })  // Conditionally include organizationId
      }

      const stableId = await createStable(user.uid, stableData)
      console.log('Stable created with ID:', stableId)

      // Navigate to the new stable's detail page
      navigate(`/stables/${stableId}`)
    } catch (error) {
      console.error('Error creating stable:', error)
      alert('Failed to create stable. Please try again.')
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

  return (
    <div className='container mx-auto p-6 max-w-2xl'>
      {/* Header */}
      <div className='mb-6'>
        <Button
          variant='ghost'
          onClick={() => navigate('/stables')}
          className='mb-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Stables
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Create New Stable</h1>
        <p className='text-muted-foreground mt-1'>
          Set up your stable and start managing shifts
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Stable Information</CardTitle>
          <CardDescription>
            Provide basic information about your stable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Stable Name */}
            <div className='space-y-2'>
              <Label htmlFor='name'>Stable Name *</Label>
              <Input
                id='name'
                name='name'
                placeholder='e.g. Green Valley Stables'
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
                placeholder='Brief description of your stable...'
                value={formData.description}
                onChange={handleChange}
                rows={4}
              />
            </div>

            {/* Address */}
            <div className='space-y-2'>
              <Label htmlFor='address'>Street Address *</Label>
              <Input
                id='address'
                name='address'
                placeholder='e.g. Vallvägen 12'
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* City and Postal Code */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='city'>City *</Label>
                <Input
                  id='city'
                  name='city'
                  placeholder='e.g. Stockholm'
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='postalCode'>Postal Code *</Label>
                <Input
                  id='postalCode'
                  name='postalCode'
                  placeholder='e.g. 123 45'
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                />
              </div>
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
                  'Create Stable'
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigate('/stables')}
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
