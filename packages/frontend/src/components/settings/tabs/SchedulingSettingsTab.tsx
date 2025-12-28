import { NumberField } from '../fields/NumberField'
import { ToggleSetting } from '../fields/ToggleSetting'
import { SettingSection } from '../sections/SettingSection'

export interface SchedulingSettings {
  scheduleHorizonDays: number
  autoAssignment: boolean
  allowSwaps: boolean
  requireApproval: boolean
}

interface SchedulingSettingsTabProps {
  settings: SchedulingSettings
  onChange: (settings: SchedulingSettings) => void
  disabled?: boolean
}

export function SchedulingSettingsTab({
  settings,
  onChange,
  disabled = false
}: SchedulingSettingsTabProps) {
  const handleFieldChange = <K extends keyof SchedulingSettings>(
    field: K,
    value: SchedulingSettings[K]
  ) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <SettingSection
      title='Scheduling Preferences'
      description='Configure how schedules are created and managed'
    >
      <NumberField
        id='scheduleHorizon'
        label='Schedule Horizon (days)'
        value={settings.scheduleHorizonDays}
        onChange={(value) => handleFieldChange('scheduleHorizonDays', value)}
        min={7}
        max={90}
        description='How many days in advance to create schedules'
        disabled={disabled}
      />

      <ToggleSetting
        id='autoAssignment'
        label='Automatic Shift Assignment'
        description='Use fairness algorithm to automatically assign shifts'
        checked={settings.autoAssignment}
        onCheckedChange={(checked) => handleFieldChange('autoAssignment', checked)}
        disabled={disabled}
      />

      <ToggleSetting
        id='allowSwaps'
        label='Allow Shift Swaps'
        description='Members can request to swap shifts with each other'
        checked={settings.allowSwaps}
        onCheckedChange={(checked) => handleFieldChange('allowSwaps', checked)}
        disabled={disabled}
      />

      <ToggleSetting
        id='requireApproval'
        label='Require Owner Approval'
        description='Shift swaps must be approved by stable owner'
        checked={settings.requireApproval}
        onCheckedChange={(checked) => handleFieldChange('requireApproval', checked)}
        disabled={disabled || !settings.allowSwaps}
      />
    </SettingSection>
  )
}
