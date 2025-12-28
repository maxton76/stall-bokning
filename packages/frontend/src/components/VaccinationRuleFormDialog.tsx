import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { VaccinationRule } from '@/types/roles'

interface VaccinationRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: Omit<VaccinationRule, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>
  rule?: VaccinationRule | null
  title?: string
}

export function VaccinationRuleFormDialog({
  open,
  onOpenChange,
  onSave,
  rule,
  title = 'Create Vaccination Rule'
}: VaccinationRuleFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    periodMonths: 0,
    periodDays: 0,
    daysNotCompeting: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        periodMonths: rule.periodMonths,
        periodDays: rule.periodDays,
        daysNotCompeting: rule.daysNotCompeting
      })
    } else {
      setFormData({
        name: '',
        description: '',
        periodMonths: 0,
        periodDays: 0,
        daysNotCompeting: 0
      })
    }
  }, [rule, open])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a rule name')
      return
    }

    if (formData.periodMonths < 0 || formData.periodDays < 0 || formData.daysNotCompeting < 0) {
      alert('All numeric fields must be 0 or greater')
      return
    }

    if (formData.periodMonths === 0 && formData.periodDays === 0) {
      alert('Period between vaccinations must be at least 1 day or 1 month')
      return
    }

    try {
      setLoading(true)
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        periodMonths: formData.periodMonths,
        periodDays: formData.periodDays,
        daysNotCompeting: formData.daysNotCompeting
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving vaccination rule:', error)
      alert('Failed to save vaccination rule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {rule ? 'Update the vaccination rule details below.' : 'Create a new vaccination rule for your stable.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Rule Name *</Label>
            <Input
              id='name'
              placeholder='e.g., FEI rules'
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              placeholder='Optional description for this rule'
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className='grid gap-2'>
            <Label>Period Between Vaccinations</Label>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='periodMonths' className='text-sm text-muted-foreground'>Months</Label>
                <Input
                  id='periodMonths'
                  type='number'
                  min='0'
                  placeholder='0'
                  value={formData.periodMonths || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodMonths: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='periodDays' className='text-sm text-muted-foreground'>Days</Label>
                <Input
                  id='periodDays'
                  type='number'
                  min='0'
                  placeholder='0'
                  value={formData.periodDays || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodDays: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <p className='text-xs text-muted-foreground'>
              {formData.periodMonths > 0 || formData.periodDays > 0
                ? `Vaccinate every ${formData.periodMonths > 0 ? `${formData.periodMonths} month${formData.periodMonths !== 1 ? 's' : ''}` : ''}${formData.periodMonths > 0 && formData.periodDays > 0 ? ' and ' : ''}${formData.periodDays > 0 ? `${formData.periodDays} day${formData.periodDays !== 1 ? 's' : ''}` : ''}`
                : 'Enter period between vaccinations'}
            </p>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='daysNotCompeting'>Days Not Competing After Vaccination</Label>
            <Input
              id='daysNotCompeting'
              type='number'
              min='0'
              placeholder='e.g., 7'
              value={formData.daysNotCompeting || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, daysNotCompeting: parseInt(e.target.value) || 0 }))}
            />
            <p className='text-xs text-muted-foreground'>
              Number of days the horse cannot compete after vaccination
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : rule ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
