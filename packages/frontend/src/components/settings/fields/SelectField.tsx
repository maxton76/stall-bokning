import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

export function SelectField({
  id,
  label,
  description,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error,
  className
}: SelectFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={description ? `${id}-description` : undefined}
        className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
      >
        {placeholder && (
          <option value='' disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
