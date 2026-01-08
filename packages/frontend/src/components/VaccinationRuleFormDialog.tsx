import { useEffect } from 'react'
import { z } from 'zod'
import { Controller } from 'react-hook-form'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormTextarea } from '@/components/form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { VaccinationRule } from '@/types/roles'

interface VaccinationRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: Omit<VaccinationRule, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>
  rule?: VaccinationRule | null
  title?: string
}

const vaccinationRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
  periodMonths: z.number().min(0, 'Months must be 0 or greater').int(),
  periodDays: z.number().min(0, 'Days must be 0 or greater').int(),
  daysNotCompeting: z.number().min(0, 'Days must be 0 or greater').int(),
  scope: z.enum(['organization', 'user'] as const),
}).refine(
  (data) => data.periodMonths > 0 || data.periodDays > 0,
  {
    message: 'Period between vaccinations must be at least 1 day or 1 month',
    path: ['periodMonths'], // Show error on periodMonths field
  }
)

type VaccinationRuleFormData = z.infer<typeof vaccinationRuleSchema>

export function VaccinationRuleFormDialog({
  open,
  onOpenChange,
  onSave,
  rule,
  title
}: VaccinationRuleFormDialogProps) {
  const isEditMode = !!rule

  const { form, handleSubmit, resetForm } = useFormDialog<VaccinationRuleFormData>({
    schema: vaccinationRuleSchema,
    defaultValues: {
      name: '',
      description: '',
      periodMonths: 0,
      periodDays: 0,
      daysNotCompeting: 0,
      scope: 'user',
    },
    onSubmit: async (data) => {
      await onSave({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        periodMonths: data.periodMonths,
        periodDays: data.periodDays,
        daysNotCompeting: data.daysNotCompeting,
        scope: data.scope,
      } as any)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: isEditMode ? 'Vaccination rule updated successfully' : 'Vaccination rule created successfully',
    errorMessage: isEditMode ? 'Failed to update vaccination rule' : 'Failed to create vaccination rule',
  })

  // Watch period fields for helper text
  const periodMonths = form.watch('periodMonths')
  const periodDays = form.watch('periodDays')

  // Reset form when dialog opens with rule data
  useEffect(() => {
    if (rule) {
      resetForm({
        name: rule.name,
        description: rule.description || '',
        periodMonths: rule.periodMonths,
        periodDays: rule.periodDays,
        daysNotCompeting: rule.daysNotCompeting,
        scope: rule.scope === 'system' ? 'user' : rule.scope, // System rules can't be edited, default to user
      })
    } else {
      resetForm()
    }
  }, [rule, open])

  const dialogTitle = title || (isEditMode ? 'Edit Vaccination Rule' : 'Create Vaccination Rule')
  const dialogDescription = isEditMode
    ? 'Update the vaccination rule details below.'
    : 'Create a personal or organization-wide vaccination rule.'

  // Helper text for period
  const periodHelperText = periodMonths > 0 || periodDays > 0
    ? `Vaccinate every ${periodMonths > 0 ? `${periodMonths} month${periodMonths !== 1 ? 's' : ''}` : ''}${periodMonths > 0 && periodDays > 0 ? ' and ' : ''}${periodDays > 0 ? `${periodDays} day${periodDays !== 1 ? 's' : ''}` : ''}`
    : 'Enter period between vaccinations'

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Update' : 'Create'}
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label="Rule Name"
        form={form}
        placeholder="e.g., FEI rules"
        required
      />

      {/* Scope Selector - Only show in create mode */}
      {!isEditMode && (
        <div className="space-y-2">
          <Label>Rule Scope <span className="text-destructive ml-1">*</span></Label>
          <Controller
            name="scope"
            control={form.control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/50">
                  <RadioGroupItem value="user" id="scope-user" />
                  <Label htmlFor="scope-user" className="flex-1 cursor-pointer font-normal">
                    <div className="font-medium">Personal Rule</div>
                    <div className="text-xs text-muted-foreground">
                      Only visible and editable by you
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/50">
                  <RadioGroupItem value="organization" id="scope-organization" />
                  <Label htmlFor="scope-organization" className="flex-1 cursor-pointer font-normal">
                    <div className="font-medium">Organization Rule</div>
                    <div className="text-xs text-muted-foreground">
                      Shared with all members of your organization
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>
      )}

      <FormTextarea
        name="description"
        label="Description"
        form={form}
        placeholder="Optional description for this rule"
        rows={2}
      />

      {/* Period Between Vaccinations - Custom layout for better UX */}
      <div className="space-y-2">
        <Label>Period Between Vaccinations <span className="text-destructive ml-1">*</span></Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periodMonths" className="text-sm text-muted-foreground">Months</Label>
            <Input
              id="periodMonths"
              type="number"
              min="0"
              placeholder="0"
              {...form.register('periodMonths', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodDays" className="text-sm text-muted-foreground">Days</Label>
            <Input
              id="periodDays"
              type="number"
              min="0"
              placeholder="0"
              {...form.register('periodDays', { valueAsNumber: true })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {periodHelperText}
        </p>
        {form.formState.errors.periodMonths && (
          <p className="text-sm text-destructive">{form.formState.errors.periodMonths.message}</p>
        )}
      </div>

      <FormInput
        name="daysNotCompeting"
        label="Days Not Competing After Vaccination"
        form={form}
        type="number"
        placeholder="e.g., 7"
        helperText="Number of days the horse cannot compete after vaccination"
      />
    </BaseFormDialog>
  )
}
