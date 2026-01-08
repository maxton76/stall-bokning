import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Base form field wrapper component
 * Provides consistent structure for label, input, and error display
 */
export interface FormFieldProps {
  /** Field label */
  label: string
  /** Field ID (should match input name) */
  htmlFor: string
  /** Input component (Input, Select, Textarea, etc.) */
  children: ReactNode
  /** Error message to display */
  error?: string
  /** Optional helper text */
  helperText?: string
  /** Whether field is required */
  required?: boolean
  /** Custom class name for wrapper */
  className?: string
}

export function FormField({
  label,
  htmlFor,
  children,
  error,
  helperText,
  required,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
