import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserIcon, Mail, Calendar } from 'lucide-react'

export default function AccountPage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  const getJoinDate = () => {
    // For now, show a placeholder. In production, this would come from user metadata
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className='container mx-auto p-6 max-w-4xl space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>My Account</h1>
        <p className='text-muted-foreground mt-1'>
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Avatar Section */}
          <div className='flex items-center gap-6'>
            <Avatar className='size-24'>
              <AvatarImage src='' alt={user?.fullName || 'User'} />
              <AvatarFallback className='text-2xl'>{user?.initials || 'U'}</AvatarFallback>
            </Avatar>
            <div className='space-y-2'>
              <h3 className='font-semibold text-lg'>{user?.fullName}</h3>
              <p className='text-sm text-muted-foreground'>{user?.email}</p>
              <Button variant='outline' size='sm' disabled>
                Change Avatar
              </Button>
            </div>
          </div>

          {/* Account Details */}
          <div className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email Address</Label>
                <div className='flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <Input
                    id='email'
                    type='email'
                    value={user?.email || ''}
                    disabled
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='uid'>User ID</Label>
                <div className='flex items-center gap-2'>
                  <UserIcon className='h-4 w-4 text-muted-foreground' />
                  <Input
                    id='uid'
                    value={user?.uid || ''}
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Member Since</Label>
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-muted-foreground' />
                <Input value={getJoinDate()} disabled />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>
            Current status and access level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Account Status</span>
              <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'>
                Active
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Email Verified</span>
              <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'>
                Verified
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className='border-destructive'>
        <CardHeader>
          <CardTitle className='text-destructive'>Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant='destructive' disabled>
            Delete Account
          </Button>
          <p className='text-xs text-muted-foreground mt-2'>
            This action cannot be undone. This will permanently delete your account and remove all data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
