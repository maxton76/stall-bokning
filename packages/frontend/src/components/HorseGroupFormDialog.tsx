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
import type { HorseGroup } from '@/types/roles'

interface HorseGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (group: Omit<HorseGroup, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>
  group?: HorseGroup | null
  title?: string
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#10b981' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'pink', label: 'Pink', color: '#ec4899' },
]

export function HorseGroupFormDialog({
  open,
  onOpenChange,
  onSave,
  group,
  title = 'Create Horse Group'
}: HorseGroupFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0].value
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || '',
        color: group.color || COLOR_OPTIONS[0].value
      })
    } else {
      setFormData({
        name: '',
        description: '',
        color: COLOR_OPTIONS[0].value
      })
    }
  }, [group, open])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a group name')
      return
    }

    try {
      setLoading(true)
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving horse group:', error)
      alert('Failed to save horse group. Please try again.')
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
            {group ? 'Update the horse group details below.' : 'Create a new group to organize your horses.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Group Name *</Label>
            <Input
              id='name'
              placeholder='e.g., Competition Horses'
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              placeholder='Optional description for this group'
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className='grid gap-2'>
            <Label>Color</Label>
            <div className='grid grid-cols-3 gap-2'>
              {COLOR_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => setFormData(prev => ({ ...prev, color: option.value }))}
                  className={`flex items-center gap-2 p-3 rounded-md border-2 transition-colors ${
                    formData.color === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className='w-6 h-6 rounded-full border border-gray-300'
                    style={{ backgroundColor: option.color }}
                  />
                  <span className='text-sm font-medium'>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : group ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
