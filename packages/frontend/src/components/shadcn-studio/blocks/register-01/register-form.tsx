import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerUser } from '@/services/userService'
import { useToast } from '@/hooks/use-toast'
import { useOrganizationContext } from '@/contexts/OrganizationContext'

const RegisterForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { setCurrentOrganizationId } = useOrganizationContext()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.firstName.trim()) {
      toast({
        title: 'Error',
        description: 'First name is required',
        variant: 'destructive'
      })
      return
    }

    if (!formData.lastName.trim()) {
      toast({
        title: 'Error',
        description: 'Last name is required',
        variant: 'destructive'
      })
      return
    }

    if (!formData.email.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive'
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return
    }

    if (!formData.agreedToTerms) {
      toast({
        title: 'Error',
        description: 'You must agree to the privacy policy and terms',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)

      const organizationId = await registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      })

      // Set the new organization as current
      setCurrentOrganizationId(organizationId)

      toast({
        title: 'Success',
        description: 'Welcome to StableBook! Your organization has been created.'
      })

      // Navigate to dashboard (user is already logged in after registration)
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Failed to create account. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      {/* First Name */}
      <div className='space-y-1'>
        <Label className='leading-5' htmlFor='firstName'>
          First Name*
        </Label>
        <Input
          type='text'
          id='firstName'
          placeholder='John'
          value={formData.firstName}
          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
          disabled={isLoading}
        />
      </div>

      {/* Last Name */}
      <div className='space-y-1'>
        <Label className='leading-5' htmlFor='lastName'>
          Last Name*
        </Label>
        <Input
          type='text'
          id='lastName'
          placeholder='Doe'
          value={formData.lastName}
          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
          disabled={isLoading}
        />
      </div>

      {/* Email */}
      <div className='space-y-1'>
        <Label className='leading-5' htmlFor='userEmail'>
          Email address*
        </Label>
        <Input
          type='email'
          id='userEmail'
          placeholder='Enter your email address'
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          disabled={isLoading}
        />
      </div>

      {/* Password */}
      <div className='w-full space-y-1'>
        <Label className='leading-5' htmlFor='password'>
          Password*
        </Label>
        <div className='relative'>
          <Input
            id='password'
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder='••••••••••••••••'
            className='pr-9'
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            disabled={isLoading}
          />
          <Button
            variant='ghost'
            size='icon'
            type='button'
            onClick={() => setIsPasswordVisible(prevState => !prevState)}
            className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
            disabled={isLoading}
          >
            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className='sr-only'>{isPasswordVisible ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className='w-full space-y-1'>
        <Label className='leading-5' htmlFor='confirmPassword'>
          Confirm Password*
        </Label>
        <div className='relative'>
          <Input
            id='confirmPassword'
            type={isConfirmPasswordVisible ? 'text' : 'password'}
            placeholder='••••••••••••••••'
            className='pr-9'
            value={formData.confirmPassword}
            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
            disabled={isLoading}
          />
          <Button
            variant='ghost'
            size='icon'
            type='button'
            onClick={() => setIsConfirmPasswordVisible(prevState => !prevState)}
            className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
            disabled={isLoading}
          >
            {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className='sr-only'>{isConfirmPasswordVisible ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      </div>

      {/* Privacy policy */}
      <div className='flex items-center gap-3'>
        <Checkbox
          id='agreedToTerms'
          className='size-6'
          checked={formData.agreedToTerms}
          onCheckedChange={checked => setFormData({ ...formData, agreedToTerms: checked === true })}
          disabled={isLoading}
        />
        <Label htmlFor='agreedToTerms'>
          <span className='text-muted-foreground'>I agree to</span> <a href='#'>privacy policy & terms</a>
        </Label>
      </div>

      <Button className='w-full' type='submit' disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create StableBook Account'}
      </Button>
    </form>
  )
}

export default RegisterForm
