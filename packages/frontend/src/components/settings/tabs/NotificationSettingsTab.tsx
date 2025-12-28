import { ToggleSetting } from '../fields/ToggleSetting'
import { SettingSection } from '../sections/SettingSection'

export interface NotificationSettings {
  emailNotifications: boolean
  shiftReminders: boolean
  schedulePublished: boolean
  memberJoined: boolean
  shiftSwapRequests: boolean
}

interface NotificationSettingsTabProps {
  settings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
  disabled?: boolean
}

export function NotificationSettingsTab({
  settings,
  onChange,
  disabled = false
}: NotificationSettingsTabProps) {
  const handleFieldChange = <K extends keyof NotificationSettings>(
    field: K,
    value: NotificationSettings[K]
  ) => {
    // If master switch is being disabled, disable all dependent notifications
    if (field === 'emailNotifications' && !value) {
      onChange({
        ...settings,
        emailNotifications: false,
        shiftReminders: false,
        schedulePublished: false,
        memberJoined: false,
        shiftSwapRequests: false
      })
    } else {
      onChange({ ...settings, [field]: value })
    }
  }

  const masterEnabled = settings.emailNotifications

  return (
    <SettingSection
      title='Notification Preferences'
      description='Choose which events trigger email notifications'
    >
      <ToggleSetting
        id='emailNotifications'
        label='Email Notifications'
        description='Master switch for all email notifications'
        checked={settings.emailNotifications}
        onCheckedChange={(checked) => handleFieldChange('emailNotifications', checked)}
        disabled={disabled}
      />

      <div className='border-t pt-4 space-y-4'>
        <p className='text-sm font-medium'>Send notifications for:</p>

        <ToggleSetting
          id='shiftReminders'
          label='Upcoming Shift Reminders'
          description='Remind members about their shifts 24 hours in advance'
          checked={settings.shiftReminders}
          onCheckedChange={(checked) => handleFieldChange('shiftReminders', checked)}
          disabled={disabled || !masterEnabled}
        />

        <ToggleSetting
          id='schedulePublished'
          label='Schedule Published'
          description='Notify members when a new schedule is published'
          checked={settings.schedulePublished}
          onCheckedChange={(checked) => handleFieldChange('schedulePublished', checked)}
          disabled={disabled || !masterEnabled}
        />

        <ToggleSetting
          id='memberJoined'
          label='New Member Joined'
          description='Notify owners when a new member joins the stable'
          checked={settings.memberJoined}
          onCheckedChange={(checked) => handleFieldChange('memberJoined', checked)}
          disabled={disabled || !masterEnabled}
        />

        <ToggleSetting
          id='shiftSwapRequests'
          label='Shift Swap Requests'
          description='Notify when members request shift swaps'
          checked={settings.shiftSwapRequests}
          onCheckedChange={(checked) => handleFieldChange('shiftSwapRequests', checked)}
          disabled={disabled || !masterEnabled}
        />
      </div>
    </SettingSection>
  )
}
