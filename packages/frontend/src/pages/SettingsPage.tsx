import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Bell, Moon, Globe, Shield } from 'lucide-react'
import { ToggleSetting } from '@/components/settings/fields/ToggleSetting'
import { SettingSection } from '@/components/settings/sections/SettingSection'

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
      <SettingSection
        title='Notifications'
        description='Configure how you receive notifications'
        icon={Bell}
      >
        <ToggleSetting
          id='email-notifications'
          label='Email Notifications'
          description='Receive notifications via email'
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
        />

        <ToggleSetting
          id='push-notifications'
          label='Push Notifications'
          description='Receive push notifications in browser'
          checked={pushNotifications}
          onCheckedChange={setPushNotifications}
        />
      </SettingSection>

      {/* Appearance */}
      <SettingSection
        title='Appearance'
        description='Customize how the application looks'
        icon={Moon}
      >
        <ToggleSetting
          id='dark-mode'
          label='Dark Mode'
          description='Enable dark mode theme'
          checked={darkMode}
          onCheckedChange={setDarkMode}
          disabled
        />
        <p className='text-xs text-muted-foreground'>
          Dark mode functionality coming soon
        </p>
      </SettingSection>

      {/* Language & Region */}
      <SettingSection
        title='Language & Region'
        description='Set your language and regional preferences'
        icon={Globe}
      >
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
      </SettingSection>

      {/* Privacy & Security */}
      <SettingSection
        title='Privacy & Security'
        description='Manage your privacy and security settings'
        icon={Shield}
      >
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
      </SettingSection>

      {/* Save Button */}
      <div className='flex justify-end gap-4'>
        <Button variant='outline'>Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
