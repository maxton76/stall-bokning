# Form Components

Reusable form field components with built-in react-hook-form integration, validation display, and consistent styling.

## Overview

These components provide a standardized way to create forms with automatic error handling, validation, and consistent styling across the application.

**Benefits**:
- **Reduced Boilerplate**: 10-15 lines of form markup → 3-5 lines
- **Consistent UI**: All form fields share the same styling and error display
- **Type Safety**: Full TypeScript support with generic types
- **Automatic Validation**: Built-in error message display from react-hook-form
- **Accessibility**: Proper ARIA labels and semantic HTML

## Components

### FormInput

Text, number, email, tel, url, and password inputs.

```typescript
<FormInput
  name="email"
  label="Email Address"
  form={form}
  type="email"
  placeholder="user@example.com"
  required
/>
```

**Props**:
- `name` - Field name (matches form schema)
- `label` - Display label
- `form` - react-hook-form's `UseFormReturn` object
- `type` - Input type (default: 'text')
- `placeholder` - Placeholder text
- `required` - Shows asterisk on label
- `disabled` - Disables input
- `helperText` - Additional help text below input

### FormSelect

Dropdown select with options.

```typescript
<FormSelect
  name="gender"
  label="Gender"
  form={form}
  options={[
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ]}
  placeholder="Select gender"
  required
/>
```

**Props**:
- `name` - Field name
- `label` - Display label
- `form` - react-hook-form object
- `options` - Array of `{ value: string, label: string }`
- `placeholder` - Placeholder text
- `required` - Shows asterisk on label
- `disabled` - Disables select

### FormTextarea

Multi-line text input.

```typescript
<FormTextarea
  name="notes"
  label="Notes"
  form={form}
  placeholder="Additional notes..."
  rows={3}
/>
```

**Props**:
- `name` - Field name
- `label` - Display label
- `form` - react-hook-form object
- `placeholder` - Placeholder text
- `rows` - Number of visible rows (default: 3)
- `required` - Shows asterisk on label
- `disabled` - Disables textarea

### FormColorPicker

Visual color selection grid.

```typescript
<FormColorPicker
  name="color"
  label="Color"
  form={form}
  colors={['#ef4444', '#3b82f6', '#10b981']}
  required
/>
```

**Props**:
- `name` - Field name
- `label` - Display label
- `form` - react-hook-form object
- `colors` - Array of hex color strings
- `required` - Shows asterisk on label

### FormCheckboxGroup

Multiple checkbox selection (array field).

```typescript
<FormCheckboxGroup
  name="roles"
  label="Roles"
  form={form}
  options={[
    { value: 'admin', label: 'Administrator' },
    { value: 'user', label: 'User' },
  ]}
  columns={2}
  required
/>
```

**Props**:
- `name` - Field name (must be array in schema)
- `label` - Display label
- `form` - react-hook-form object
- `options` - Array of `{ value: string, label: string }`
- `columns` - Number of grid columns (1-4, default: 1)
- `helperText` - Additional help text
- `required` - Shows asterisk on label
- `disabled` - Disables all checkboxes

### FormDatePicker

Native HTML5 date input.

```typescript
<FormDatePicker
  name="dateOfBirth"
  label="Date of Birth"
  form={form}
  required
/>
```

**Props**:
- `name` - Field name (Date type in schema)
- `label` - Display label
- `form` - react-hook-form object
- `required` - Shows asterisk on label
- `min` - Minimum date (YYYY-MM-DD)
- `max` - Maximum date (YYYY-MM-DD)

## Usage with BaseFormDialog

These components work seamlessly with `BaseFormDialog` and `useFormDialog`:

```typescript
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormSelect, FormTextarea } from '@/components/form'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['personal', 'business']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function MyFormDialog({ open, onOpenChange, onSave }) {
  const { form, handleSubmit, resetForm } = useFormDialog<FormData>({
    schema,
    defaultValues: {
      name: '',
      type: 'personal',
      notes: '',
    },
    onSubmit: async (data) => {
      await onSave(data)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
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

      <FormTextarea
        name="notes"
        label="Notes"
        form={form}
        rows={3}
      />
    </BaseFormDialog>
  )
}
```

## Migration Guide

### Before (Manual Implementation)

```typescript
<div className="space-y-2">
  <Label htmlFor="name">
    Name <span className="text-destructive">*</span>
  </Label>
  <Input
    id="name"
    {...form.register('name')}
    placeholder="Enter name"
  />
  {form.formState.errors.name && (
    <p className="text-sm text-destructive">
      {form.formState.errors.name.message}
    </p>
  )}
</div>
```

### After (Using FormInput)

```typescript
<FormInput
  name="name"
  label="Name"
  form={form}
  placeholder="Enter name"
  required
/>
```

**Lines saved**: 10 lines → 6 lines (40% reduction)

## Best Practices

1. **Always use with Zod validation** - Define schemas for type safety and validation
2. **Consistent naming** - Use camelCase for field names matching your TypeScript types
3. **Required fields** - Use the `required` prop to show asterisk on labels
4. **Helper text** - Use for additional context or validation requirements
5. **Placeholder text** - Provide examples of expected input format
6. **Accessible labels** - Let the components handle aria-labels automatically

## TypeScript Support

All components are fully typed with generic support:

```typescript
import type { UseFormReturn, FieldValues } from 'react-hook-form'

interface FormInputProps<T extends FieldValues> {
  name: Path<T>
  label: string
  form: UseFormReturn<T>
  // ... other props
}
```

This ensures type safety when using the components with your form data types.
