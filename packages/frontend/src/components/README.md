# Component Patterns & Best Practices

Standardized patterns for building consistent, maintainable components in the frontend application.

## BaseFormDialog + useFormDialog Pattern

**Purpose**: Eliminate boilerplate in form dialogs with automatic validation, submission handling, loading states, and toast notifications.

### When to Use

✅ **Use for**:
- Any dialog with form inputs
- Create/Edit operations
- Settings and configuration dialogs
- Multi-field data entry

❌ **Don't use for**:
- Simple confirmation dialogs (use AlertDialog instead)
- Read-only information displays
- Complex multi-step wizards (consider custom implementation)

### Basic Pattern

```typescript
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormSelect } from '@/components/form'

// 1. Define Zod schema for validation
const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['personal', 'business']),
  email: z.string().email('Invalid email address'),
})

type FormData = z.infer<typeof schema>

// 2. Create dialog component
export function MyFormDialog({ open, onOpenChange, onSave, initialData }) {
  const { form, handleSubmit, resetForm } = useFormDialog<FormData>({
    schema,
    defaultValues: initialData || {
      name: '',
      type: 'personal',
      email: '',
    },
    onSubmit: async (data) => {
      await onSave(data)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: 'Saved successfully!',
    errorMessage: 'Failed to save',
  })

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Entry"
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Save"
    >
      <FormInput
        name="name"
        label="Name"
        form={form}
        required
      />

      <FormSelect
        name="type"
        label="Type"
        form={form}
        options={[
          { value: 'personal', label: 'Personal' },
          { value: 'business', label: 'Business' },
        ]}
        required
      />

      <FormInput
        name="email"
        label="Email"
        form={form}
        type="email"
        required
      />
    </BaseFormDialog>
  )
}
```

### Advanced Patterns

#### Complex Validation with `.refine()`

For cross-field validation or conditional logic:

```typescript
const schema = z.object({
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isAllDay: z.boolean(),
}).refine(
  (data) => {
    if (data.isAllDay) return true
    return data.endTime > data.startTime
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'], // Error shows on endTime field
  }
)
```

#### Conditional Fields

Show/hide fields based on form values:

```typescript
export function ConditionalFormDialog({ open, onOpenChange, onSave }) {
  const { form, handleSubmit } = useFormDialog<FormData>({
    schema,
    defaultValues,
    onSubmit: async (data) => { await onSave(data) },
    onSuccess: () => { onOpenChange(false) },
  })

  const isExternal = form.watch('isExternal')

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Entry"
      form={form}
      onSubmit={handleSubmit}
    >
      <FormCheckbox name="isExternal" label="External User" form={form} />

      {!isExternal && (
        <FormInput
          name="internalId"
          label="Internal ID"
          form={form}
          required
        />
      )}
    </BaseFormDialog>
  )
}
```

#### Edit Mode with Initial Data

```typescript
export function EditFormDialog({ open, onOpenChange, existingData, onUpdate }) {
  const { form, handleSubmit, resetForm } = useFormDialog<FormData>({
    schema,
    defaultValues: existingData || defaultValues,
    onSubmit: async (data) => {
      await onUpdate(existingData.id, data)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
  })

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open && existingData) {
      form.reset(existingData)
    }
  }, [open, existingData, form])

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Entry"
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Update"
    >
      {/* Form fields */}
    </BaseFormDialog>
  )
}
```

#### Array Fields with Dynamic Addition

```typescript
const schema = z.object({
  name: z.string().min(1),
  tags: z.array(z.string()).min(1, 'At least one tag required'),
})

export function ArrayFormDialog({ open, onOpenChange, onSave }) {
  const { form, handleSubmit } = useFormDialog<FormData>({
    schema,
    defaultValues: { name: '', tags: [''] },
    onSubmit: async (data) => { await onSave(data) },
    onSuccess: () => { onOpenChange(false) },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tags',
  })

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Entry"
      form={form}
      onSubmit={handleSubmit}
    >
      <FormInput name="name" label="Name" form={form} required />

      <div className="space-y-2">
        <Label>Tags</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <FormInput
              name={`tags.${index}`}
              label=""
              form={form}
              placeholder="Enter tag"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => append('')}
        >
          Add Tag
        </Button>
      </div>
    </BaseFormDialog>
  )
}
```

### useFormDialog Hook Reference

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | `ZodSchema<T>` | Yes | Zod validation schema |
| `defaultValues` | `T` | Yes | Initial form values |
| `onSubmit` | `(data: T) => Promise<void>` | Yes | Async function called on valid submission |
| `onSuccess` | `() => void` | No | Called after successful submission |
| `onError` | `(error: Error) => void` | No | Called if submission fails |
| `successMessage` | `string` | No | Toast message on success (default: "Success!") |
| `errorMessage` | `string` | No | Toast message on error (default: "An error occurred") |

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `form` | `UseFormReturn<T>` | React Hook Form instance |
| `handleSubmit` | `(e: FormEvent) => Promise<void>` | Form submission handler |
| `resetForm` | `() => void` | Resets form to default values |

### BaseFormDialog Component Reference

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Yes | Called when dialog should close |
| `title` | `string` | Yes | Dialog header title |
| `description` | `string` | No | Optional description text |
| `form` | `UseFormReturn<any>` | Yes | React Hook Form instance |
| `onSubmit` | `(e: FormEvent) => Promise<void>` | Yes | Form submission handler |
| `submitLabel` | `string` | No | Submit button text (default: "Submit") |
| `cancelLabel` | `string` | No | Cancel button text (default: "Cancel") |
| `children` | `ReactNode` | Yes | Form fields |

### Migration Guide

#### Before (Manual Implementation - 50+ lines)

```typescript
export function OldFormDialog({ open, onOpenChange, onSave }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      await onSave(data)
      toast.success('Saved successfully!')
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### After (BaseFormDialog Pattern - 25 lines)

```typescript
export function NewFormDialog({ open, onOpenChange, onSave }) {
  const { form, handleSubmit } = useFormDialog<FormData>({
    schema,
    defaultValues: { name: '', email: '' },
    onSubmit: async (data) => { await onSave(data) },
    onSuccess: () => { onOpenChange(false) },
    successMessage: 'Saved successfully!',
    errorMessage: 'Failed to save',
  })

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Entry"
      form={form}
      onSubmit={handleSubmit}
    >
      <FormInput name="name" label="Name" form={form} required />
      <FormInput name="email" label="Email" form={form} type="email" required />
    </BaseFormDialog>
  )
}
```

**Result**: 50% code reduction with improved consistency and error handling.

## Best Practices

### 1. Schema-First Development

Always define your Zod schema first. This provides:
- Type safety via `z.infer<typeof schema>`
- Runtime validation
- Clear contract for form data
- Self-documenting field requirements

### 2. Consistent Field Naming

Use camelCase for field names matching TypeScript conventions:
```typescript
// Good
{ firstName: string, dateOfBirth: Date }

// Bad
{ first_name: string, 'date-of-birth': Date }
```

### 3. Required Field Indication

Use the `required` prop to show asterisks on labels:
```typescript
<FormInput name="email" label="Email" form={form} required />
// Renders: "Email *"
```

### 4. Helper Text for Context

Provide additional context when validation rules aren't obvious:
```typescript
<FormInput
  name="password"
  label="Password"
  form={form}
  type="password"
  helperText="Must be at least 8 characters with one number"
  required
/>
```

### 5. Placeholder Examples

Use placeholders to show expected format:
```typescript
<FormInput
  name="phone"
  label="Phone Number"
  form={form}
  placeholder="555-123-4567"
/>
```

### 6. Error Message Clarity

Write clear, actionable error messages:
```typescript
// Good
z.string().min(8, 'Password must be at least 8 characters')

// Bad
z.string().min(8, 'Invalid')
```

### 7. Form Reset on Success

Always reset the form after successful submission:
```typescript
onSuccess: () => {
  form.reset() // or resetForm()
  onOpenChange(false)
}
```

### 8. Loading State Management

useFormDialog automatically handles loading states. Don't manually manage:
```typescript
// Bad
const [loading, setLoading] = useState(false)

// Good - useFormDialog handles this
const { form, handleSubmit } = useFormDialog({ ... })
```

## Common Patterns

### Confirmation Before Submit

```typescript
const { form, handleSubmit } = useFormDialog<FormData>({
  schema,
  defaultValues,
  onSubmit: async (data) => {
    const confirmed = window.confirm('Are you sure?')
    if (!confirmed) return
    await onSave(data)
  },
  onSuccess: () => { onOpenChange(false) },
})
```

### Transform Data Before Submit

```typescript
const { form, handleSubmit } = useFormDialog<FormData>({
  schema,
  defaultValues,
  onSubmit: async (data) => {
    // Transform data before saving
    const transformed = {
      ...data,
      email: data.email.toLowerCase(),
      createdAt: new Date(),
    }
    await onSave(transformed)
  },
  onSuccess: () => { onOpenChange(false) },
})
```

### Dependent Field Updates

```typescript
const type = form.watch('type')

useEffect(() => {
  if (type === 'business') {
    form.setValue('taxId', '')
  }
}, [type, form])
```

## TypeScript Support

All components are fully typed with generic support:

```typescript
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'

interface FormInputProps<T extends FieldValues> {
  name: Path<T>
  label: string
  form: UseFormReturn<T>
  // ... other props
}
```

This ensures type safety when using components with your form data types.

## Testing

### Unit Testing Form Components

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyFormDialog } from './MyFormDialog'

test('submits form with valid data', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  const onOpenChange = jest.fn()

  render(
    <MyFormDialog
      open={true}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  )

  await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
  await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
  await userEvent.click(screen.getByRole('button', { name: /save/i }))

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

test('displays validation errors', async () => {
  render(<MyFormDialog open={true} onOpenChange={jest.fn()} onSave={jest.fn()} />)

  await userEvent.click(screen.getByRole('button', { name: /save/i }))

  expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
})
```

## Related Documentation

- [Form Components](./form/README.md) - Individual form field components
- [React Hook Form](https://react-hook-form.com/) - Form library documentation
- [Zod](https://zod.dev/) - Schema validation library
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
