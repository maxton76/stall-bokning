import { SettingField } from '../fields/SettingField'
import { SettingSection } from '../sections/SettingSection'

export interface StableInfo {
  name: string
  description: string
  address: string
  city: string
  postalCode: string
}

interface GeneralSettingsTabProps {
  stableInfo: StableInfo
  onChange: (info: StableInfo) => void
  disabled?: boolean
}

export function GeneralSettingsTab({
  stableInfo,
  onChange,
  disabled = false
}: GeneralSettingsTabProps) {
  const handleFieldChange = (field: keyof StableInfo, value: string) => {
    onChange({ ...stableInfo, [field]: value })
  }

  return (
    <SettingSection
      title='Stable Information'
      description='Basic information about your stable'
    >
      <SettingField
        id='name'
        label='Stable Name'
        value={stableInfo.name}
        onChange={(value) => handleFieldChange('name', value)}
        placeholder='e.g. Green Valley Stables'
        disabled={disabled}
      />

      <SettingField
        id='description'
        label='Description'
        type='textarea'
        value={stableInfo.description}
        onChange={(value) => handleFieldChange('description', value)}
        placeholder='Brief description of your stable...'
        rows={3}
        disabled={disabled}
      />

      <div className='grid gap-4 md:grid-cols-3'>
        <SettingField
          id='address'
          label='Street Address'
          value={stableInfo.address}
          onChange={(value) => handleFieldChange('address', value)}
          placeholder='e.g. Vallvägen 12'
          disabled={disabled}
        />

        <SettingField
          id='city'
          label='City'
          value={stableInfo.city}
          onChange={(value) => handleFieldChange('city', value)}
          placeholder='e.g. Stockholm'
          disabled={disabled}
        />

        <SettingField
          id='postalCode'
          label='Postal Code'
          value={stableInfo.postalCode}
          onChange={(value) => handleFieldChange('postalCode', value)}
          placeholder='e.g. 123 45'
          disabled={disabled}
        />
      </div>
    </SettingSection>
  )
}
