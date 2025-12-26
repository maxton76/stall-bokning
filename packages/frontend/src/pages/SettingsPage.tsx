import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Moon, Globe, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className='container mx-auto p-6 max-w-4xl space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Settings</h1>
        <p className='text-muted-foreground mt-1'>
          Manage your application preferences and settings
        </p>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Bell className='h-5 w-5' />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='email-notifications'>Email Notifications</Label>
              <p className='text-sm text-muted-foreground'>
                Receive notifications via email
              </p>
            </div>
            <Switch
              id='email-notifications'
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='push-notifications'>Push Notifications</Label>
              <p className='text-sm text-muted-foreground'>
                Receive push notifications in browser
              </p>
            </div>
            <Switch
              id='push-notifications'
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Moon className='h-5 w-5' />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize how the application looks
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='dark-mode'>Dark Mode</Label>
              <p className='text-sm text-muted-foreground'>
                Enable dark mode theme
              </p>
            </div>
            <Switch
              id='dark-mode'
              checked={darkMode}
              onCheckedChange={setDarkMode}
              disabled
            />
          </div>
          <p className='text-xs text-muted-foreground'>
            Dark mode functionality coming soon
          </p>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Globe className='h-5 w-5' />
            <CardTitle>Language & Region</CardTitle>
          </div>
          <CardDescription>
            Set your language and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='language'>Language</Label>
            <Select defaultValue='en' disabled>
              <SelectTrigger id='language'>
                <SelectValue placeholder='Select language' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='en'>English</SelectItem>
                <SelectItem value='sv'>Svenska</SelectItem>
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              Multi-language support coming soon
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='timezone'>Timezone</Label>
            <Select defaultValue='europe-stockholm' disabled>
              <SelectTrigger id='timezone'>
                <SelectValue placeholder='Select timezone' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='europe-stockholm'>Europe/Stockholm</SelectItem>
                <SelectItem value='utc'>UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            <CardTitle>Privacy & Security</CardTitle>
          </div>
          <CardDescription>
            Manage your privacy and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Button variant='outline' disabled>
              Change Password
            </Button>
            <p className='text-xs text-muted-foreground'>
              Password management coming soon
            </p>
          </div>

          <div className='space-y-2'>
            <Button variant='outline' disabled>
              Two-Factor Authentication
            </Button>
            <p className='text-xs text-muted-foreground'>
              Enhanced security features coming soon
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className='flex justify-end gap-4'>
        <Button variant='outline'>Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
