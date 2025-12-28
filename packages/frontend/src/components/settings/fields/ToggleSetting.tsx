import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface ToggleSettingProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  layout?: 'horizontal' | 'vertical'
  className?: string
}

export function ToggleSetting({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  layout = 'horizontal',
  className
}: ToggleSettingProps) {
  if (layout === 'vertical') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className='flex items-center justify-between'>
          <Label htmlFor={id}>{label}</Label>
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-disabled={disabled}
          />
        </div>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-between space-x-2', className)}>
      <div className='space-y-0.5 flex-1'>
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-disabled={disabled}
      />
    </div>
  )
}
