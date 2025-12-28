import { NumberField } from '../fields/NumberField'
import { SelectField } from '../fields/SelectField'
import { SettingSection } from '../sections/SettingSection'

export interface WeightingSettings {
  memoryHorizonDays: number
  resetPeriod: 'monthly' | 'quarterly' | 'yearly' | 'never'
  pointsMultiplier: number
}

interface WeightingSettingsTabProps {
  settings: WeightingSettings
  onChange: (settings: WeightingSettings) => void
  disabled?: boolean
}

const RESET_PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' }
]

export function WeightingSettingsTab({
  settings,
  onChange,
  disabled = false
}: WeightingSettingsTabProps) {
  const handleFieldChange = <K extends keyof WeightingSettings>(
    field: K,
    value: WeightingSettings[K]
  ) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <SettingSection
      title='Fairness Algorithm'
      description='Configure how the system calculates fairness scores and distributes shifts'
    >
      <NumberField
        id='memoryHorizon'
        label='Memory Horizon (days)'
        value={settings.memoryHorizonDays}
        onChange={(value) => handleFieldChange('memoryHorizonDays', value)}
        min={30}
        max={365}
        description='How far back to consider shift history when calculating fairness'
        disabled={disabled}
      />

      <SelectField
        id='resetPeriod'
        label='Reset Period'
        value={settings.resetPeriod}
        onChange={(value) => handleFieldChange('resetPeriod', value as WeightingSettings['resetPeriod'])}
        options={RESET_PERIOD_OPTIONS}
        description='How often to reset shift point counters'
        disabled={disabled}
      />

      <NumberField
        id='pointsMultiplier'
        label='Points Multiplier'
        value={settings.pointsMultiplier}
        onChange={(value) => handleFieldChange('pointsMultiplier', value)}
        min={0.1}
        max={5.0}
        step={0.1}
        description='Global multiplier for all shift points'
        disabled={disabled}
      />

      <div className='rounded-lg bg-muted p-4'>
        <h4 className='font-medium mb-2'>Fairness Algorithm Preview</h4>
        <p className='text-sm text-muted-foreground'>
          With current settings, the system will consider the last{' '}
          <strong>{settings.memoryHorizonDays} days</strong> of shift history and reset
          counters <strong>{settings.resetPeriod}</strong>.
        </p>
      </div>
    </SettingSection>
  )
}
