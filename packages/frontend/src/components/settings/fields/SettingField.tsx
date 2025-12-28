import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface SettingFieldProps {
  id: string
  label: string
  description?: string
  type?: 'text' | 'textarea'
  placeholder?: string
  rows?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  required?: boolean
  className?: string
}

export function SettingField({
  id,
  label,
  description,
  type = 'text',
  placeholder,
  rows = 3,
  value,
  onChange,
  disabled = false,
  error,
  required = false,
  className
}: SettingFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className='text-destructive ml-1'>*</span>}
      </Label>
      {type === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={description ? `${id}-description` : undefined}
        />
      ) : (
        <Input
          id={id}
          type='text'
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={description ? `${id}-description` : undefined}
        />
      )}
      {description && !error && (
        <p id={`${id}-description`} className='text-sm text-muted-foreground'>
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-description`} className='text-sm text-destructive'>
          {error}
        </p>
      )}
    </div>
  )
}
