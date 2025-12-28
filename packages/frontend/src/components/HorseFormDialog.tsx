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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import type { Horse, HorseColor, HorseUsage, HorseGroup, VaccinationRule } from '@/types/roles'
import { HORSE_COLORS, HORSE_USAGE_OPTIONS, HORSE_GENDERS } from '@/constants/horseConstants'
import { Timestamp } from 'firebase/firestore'

interface HorseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (horseData: Omit<Horse, 'id' | 'ownerId' | 'ownerName' | 'ownerEmail' | 'createdAt' | 'updatedAt' | 'lastModifiedBy'>) => Promise<void>
  horse?: Horse | null
  title?: string
  allowStableAssignment?: boolean
  availableStables?: Array<{ id: string; name: string }>
  availableGroups?: HorseGroup[]
  availableRules?: VaccinationRule[]
}

interface HorseFormData {
  name: string
  breed: string
  age: string
  color: HorseColor | ''
  gender: 'stallion' | 'mare' | 'gelding' | ''
  currentStableId: string
  notes: string

  // New fields
  isExternal: boolean
  dateOfArrival: string  // Using string for native date input
  usage: HorseUsage[]
  horseGroupId: string
  vaccinationRuleId: string
  ueln: string
  chipNumber: string

  // Additional details
  sire: string
  dam: string
  damsire: string
  withersHeight: string
  dateOfBirth: string  // Using string for native date input
  studbook: string
  breeder: string
}

const emptyFormData: HorseFormData = {
  name: '',
  breed: '',
  age: '',
  color: '',
  gender: '',
  currentStableId: '',
  notes: '',
  isExternal: false,
  dateOfArrival: '',
  usage: [],
  horseGroupId: '',
  vaccinationRuleId: '',
  ueln: '',
  chipNumber: '',
  sire: '',
  dam: '',
  damsire: '',
  withersHeight: '',
  dateOfBirth: '',
  studbook: '',
  breeder: ''
}

export function HorseFormDialog({
  open,
  onOpenChange,
  onSave,
  horse,
  title,
  allowStableAssignment = false,
  availableStables = [],
  availableGroups = [],
  availableRules = []
}: HorseFormDialogProps) {
  const [formData, setFormData] = useState<HorseFormData>(emptyFormData)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (horse && open) {
      setFormData({
        name: horse.name || '',
        breed: horse.breed || '',
        age: horse.age?.toString() || '',
        color: horse.color || '',
        gender: horse.gender || '',
        currentStableId: horse.currentStableId || '',
        notes: horse.notes || '',

        // New fields
        isExternal: horse.isExternal ?? false,
        dateOfArrival: (horse.dateOfArrival
          ? new Date(horse.dateOfArrival.toMillis()).toISOString().split('T')[0]
          : '') as string,
        usage: horse.usage || [],
        horseGroupId: horse.horseGroupId || '',
        vaccinationRuleId: horse.vaccinationRuleId || '',
        ueln: horse.ueln || '',
        chipNumber: horse.chipNumber || '',

        // Additional details
        sire: horse.sire || '',
        dam: horse.dam || '',
        damsire: horse.damsire || '',
        withersHeight: horse.withersHeight?.toString() || '',
        dateOfBirth: (horse.dateOfBirth
          ? new Date(horse.dateOfBirth.toMillis()).toISOString().split('T')[0]
          : '') as string,
        studbook: horse.studbook || '',
        breeder: horse.breeder || ''
      })
    } else if (open) {
      setFormData(emptyFormData)
    }
  }, [horse, open])

  const handleSave = async () => {
    // Required field validation
    if (!formData.name.trim()) {
      alert('Please enter a horse name')
      return
    }

    if (!formData.color) {
      alert('Please select a color')
      return
    }

    // Conditional validation for non-external horses
    if (!formData.isExternal && !formData.dateOfArrival) {
      alert('Please enter a date of arrival for non-external horses')
      return
    }

    try {
      setLoading(true)

      // Find stable name if stable is selected
      let stableName = horse?.currentStableName
      if (formData.currentStableId && !stableName) {
        const stable = availableStables.find(s => s.id === formData.currentStableId)
        stableName = stable?.name
      }

      // Prepare data for save
      const horseData: any = {
        name: formData.name.trim(),
        breed: formData.breed.trim() || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        color: formData.color as HorseColor,
        gender: formData.gender || undefined,
        isExternal: formData.isExternal,
        notes: formData.notes.trim() || undefined,
        status: 'active' as const,

        // Identification
        ueln: formData.ueln.trim() || undefined,
        chipNumber: formData.chipNumber.trim() || undefined,

        // Additional details
        sire: formData.sire.trim() || undefined,
        dam: formData.dam.trim() || undefined,
        damsire: formData.damsire.trim() || undefined,
        withersHeight: formData.withersHeight ? parseInt(formData.withersHeight) : undefined,
        dateOfBirth: formData.dateOfBirth
          ? Timestamp.fromDate(new Date(formData.dateOfBirth))
          : undefined,
        studbook: formData.studbook.trim() || undefined,
        breeder: formData.breeder.trim() || undefined
      }

      // Conditional fields for non-external horses
      if (!formData.isExternal) {
        horseData.dateOfArrival = formData.dateOfArrival
          ? Timestamp.fromDate(new Date(formData.dateOfArrival))
          : undefined
        horseData.currentStableId = formData.currentStableId || undefined
        horseData.currentStableName = stableName
        horseData.assignedAt = formData.currentStableId ? (horse?.assignedAt || Timestamp.now()) : undefined
        horseData.usage = formData.usage.length > 0 ? formData.usage : undefined

        // Group assignment
        if (formData.horseGroupId) {
          horseData.horseGroupId = formData.horseGroupId
          const group = availableGroups.find(g => g.id === formData.horseGroupId)
          horseData.horseGroupName = group?.name
        } else {
          horseData.horseGroupId = undefined
          horseData.horseGroupName = undefined
        }

        // Vaccination rule assignment
        if (formData.vaccinationRuleId) {
          horseData.vaccinationRuleId = formData.vaccinationRuleId
          const rule = availableRules.find(r => r.id === formData.vaccinationRuleId)
          horseData.vaccinationRuleName = rule?.name
        } else {
          horseData.vaccinationRuleId = undefined
          horseData.vaccinationRuleName = undefined
        }
      }

      await onSave(horseData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving horse:', error)
      alert('Failed to save horse. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {title || (horse ? 'Edit Horse' : 'Add New Horse')}
          </DialogTitle>
          <DialogDescription>
            {horse
              ? 'Update the horse details below.'
              : 'Add a new horse to your account. You can optionally assign it to a stable.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Name - Required */}
          <div className='grid gap-2'>
            <Label htmlFor='name'>
              Horse Name <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='name'
              placeholder='e.g., Thunder'
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Breed */}
          <div className='grid gap-2'>
            <Label htmlFor='breed'>Breed</Label>
            <Input
              id='breed'
              placeholder='e.g., Arabian, Thoroughbred'
              value={formData.breed}
              onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
            />
          </div>

          {/* Is External Toggle */}
          <div className='grid gap-2'>
            <div className='flex items-center space-x-2'>
              <Switch
                id='isExternal'
                checked={formData.isExternal}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    isExternal: checked,
                    // Clear conditional fields when toggled on
                    ...(checked && {
                      dateOfArrival: '',
                      currentStableId: '',
                      usage: []
                    })
                  }))
                }}
              />
              <Label htmlFor='isExternal' className='text-sm font-normal cursor-pointer'>
                This horse is external (not part of the stable)
              </Label>
            </div>
          </div>

          {/* Date of Arrival - Required for non-external horses */}
          {!formData.isExternal && (
            <div className='grid gap-2'>
              <Label htmlFor='dateOfArrival'>
                Date of Arrival <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='dateOfArrival'
                type='date'
                value={formData.dateOfArrival}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfArrival: e.target.value }))}
              />
            </div>
          )}

          {/* Location/Stable Assignment - Hidden for external horses */}
          {!formData.isExternal && allowStableAssignment && availableStables.length > 0 && (
            <div className='grid gap-2'>
              <Label htmlFor='stable'>Location (Stable)</Label>
              <Select
                value={formData.currentStableId || 'none'}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    currentStableId: value === 'none' ? '' : value
                  }))
                }}
              >
                <SelectTrigger id='stable'>
                  <SelectValue placeholder='No stable (unassigned)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No stable (unassigned)</SelectItem>
                  {availableStables.map(stable => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Usage - Hidden for external horses */}
          {!formData.isExternal && (
            <div className='grid gap-2'>
              <Label>Usage</Label>
              <div className='space-y-2'>
                {HORSE_USAGE_OPTIONS.map(option => (
                  <div key={option.value} className='flex items-center space-x-2'>
                    <Checkbox
                      id={`usage-${option.value}`}
                      checked={formData.usage.includes(option.value)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          usage: checked
                            ? [...prev.usage, option.value]
                            : prev.usage.filter(u => u !== option.value)
                        }))
                      }}
                    />
                    <Label
                      htmlFor={`usage-${option.value}`}
                      className='flex items-center gap-2 cursor-pointer text-sm font-normal'
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horse Group - Hidden for external horses */}
          {!formData.isExternal && availableGroups.length > 0 && (
            <div className='grid gap-2'>
              <Label htmlFor='horseGroupId'>Horse Group</Label>
              <Select
                value={formData.horseGroupId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, horseGroupId: value }))}
              >
                <SelectTrigger id='horseGroupId'>
                  <SelectValue placeholder='No group' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>No group</SelectItem>
                  {availableGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vaccination Rule - Hidden for external horses */}
          {!formData.isExternal && availableRules.length > 0 && (
            <div className='grid gap-2'>
              <Label htmlFor='vaccinationRuleId'>Vaccination Rule</Label>
              <Select
                value={formData.vaccinationRuleId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vaccinationRuleId: value }))}
              >
                <SelectTrigger id='vaccinationRuleId'>
                  <SelectValue placeholder='No vaccination rule' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>No vaccination rule</SelectItem>
                  {availableRules.map(rule => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* UELN and Chip Number */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='ueln'>UELN</Label>
              <Input
                id='ueln'
                placeholder='Universal Equine Life Number'
                value={formData.ueln}
                onChange={(e) => setFormData(prev => ({ ...prev, ueln: e.target.value }))}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='chipNumber'>Chip Number</Label>
              <Input
                id='chipNumber'
                placeholder='Microchip number'
                value={formData.chipNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, chipNumber: e.target.value }))}
              />
            </div>
          </div>

          {/* Gender */}
          <div className='grid gap-2'>
            <Label htmlFor='gender'>Gender</Label>
            <Select
              value={formData.gender || ''}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                gender: value as 'stallion' | 'mare' | 'gelding' | ''
              }))}
            >
              <SelectTrigger id='gender'>
                <SelectValue placeholder='Select gender' />
              </SelectTrigger>
              <SelectContent>
                {HORSE_GENDERS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collapsible Additional Details Section */}
          <Collapsible>
            <CollapsibleTrigger className='flex items-center justify-between w-full py-2 text-sm font-medium hover:underline'>
              <span>Additional horse details</span>
              <ChevronDown className='h-4 w-4' />
            </CollapsibleTrigger>

            <CollapsibleContent className='space-y-4 pt-4'>
              {/* Color - REQUIRED */}
              <div className='grid gap-2'>
                <Label htmlFor='color'>
                  Color <span className='text-destructive'>*</span>
                </Label>
                <Select
                  value={formData.color || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value as HorseColor }))}
                >
                  <SelectTrigger id='color'>
                    <SelectValue placeholder='Select color' />
                  </SelectTrigger>
                  <SelectContent>
                    {HORSE_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Age */}
              <div className='grid gap-2'>
                <Label htmlFor='age'>Age (years)</Label>
                <Input
                  id='age'
                  type='number'
                  min='0'
                  max='50'
                  placeholder='e.g., 5'
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                />
              </div>

              {/* Sire and Dam */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='sire'>Sire</Label>
                  <Input
                    id='sire'
                    placeholder="Father's name"
                    value={formData.sire}
                    onChange={(e) => setFormData(prev => ({ ...prev, sire: e.target.value }))}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='dam'>Dam</Label>
                  <Input
                    id='dam'
                    placeholder="Mother's name"
                    value={formData.dam}
                    onChange={(e) => setFormData(prev => ({ ...prev, dam: e.target.value }))}
                  />
                </div>
              </div>

              {/* Withers Height and Damsire */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='withersHeight'>Withers Height</Label>
                  <div className='relative'>
                    <Input
                      id='withersHeight'
                      type='number'
                      min='0'
                      placeholder='e.g., 165'
                      value={formData.withersHeight}
                      onChange={(e) => setFormData(prev => ({ ...prev, withersHeight: e.target.value }))}
                      className='pr-10'
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
                      cm
                    </span>
                  </div>
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='damsire'>Damsire</Label>
                  <Input
                    id='damsire'
                    placeholder="Mother's father"
                    value={formData.damsire}
                    onChange={(e) => setFormData(prev => ({ ...prev, damsire: e.target.value }))}
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className='grid gap-2'>
                <Label htmlFor='dateOfBirth'>Date of Birth</Label>
                <Input
                  id='dateOfBirth'
                  type='date'
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>

              {/* Studbook */}
              <div className='grid gap-2'>
                <Label htmlFor='studbook'>Studbook</Label>
                <Input
                  id='studbook'
                  placeholder='Studbook registration'
                  value={formData.studbook}
                  onChange={(e) => setFormData(prev => ({ ...prev, studbook: e.target.value }))}
                />
              </div>

              {/* Breeder */}
              <div className='grid gap-2'>
                <Label htmlFor='breeder'>Breeder</Label>
                <Input
                  id='breeder'
                  placeholder='Breeder name'
                  value={formData.breeder}
                  onChange={(e) => setFormData(prev => ({ ...prev, breeder: e.target.value }))}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <div className='grid gap-2'>
            <Label htmlFor='notes'>Notes</Label>
            <Textarea
              id='notes'
              placeholder='Any additional information about this horse...'
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : horse ? 'Update' : 'Add Horse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
