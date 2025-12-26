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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ShiftType } from '@/types/schedule'

interface ShiftTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (shiftType: Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  shiftType?: ShiftType | null
  title?: string
}

const DAYS_OF_WEEK = [
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' },
  { value: 'Sun', label: 'Sunday' },
]

// Generate hours 00-23
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))

// Generate minutes in 15-minute intervals
const MINUTES = ['00', '15', '30', '45']

// Parse time string "HH:MM-HH:MM" into parts
function parseTimeRange(timeRange: string): { startHour: string; startMinute: string; endHour: string; endMinute: string } {
  const [start, end] = timeRange.split('-')
  const [startHour = '07', startMinute = '00'] = (start || '').split(':')
  const [endHour = '09', endMinute = '00'] = (end || '').split(':')
  return { startHour, startMinute, endHour, endMinute }
}

// Format time parts into "HH:MM-HH:MM" string
function formatTimeRange(startHour: string, startMinute: string, endHour: string, endMinute: string): string {
  return `${startHour}:${startMinute}-${endHour}:${endMinute}`
}

export function ShiftTypeDialog({
  open,
  onOpenChange,
  onSave,
  shiftType,
  title = 'Create Shift Type'
}: ShiftTypeDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    points: 0,
    daysOfWeek: [] as string[]
  })
  const [timeData, setTimeData] = useState({
    startHour: '07',
    startMinute: '00',
    endHour: '09',
    endMinute: '00'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (shiftType) {
      setFormData({
        name: shiftType.name,
        points: shiftType.points,
        daysOfWeek: shiftType.daysOfWeek
      })
      setTimeData(parseTimeRange(shiftType.time))
    } else {
      setFormData({
        name: '',
        points: 0,
        daysOfWeek: []
      })
      setTimeData({
        startHour: '07',
        startMinute: '00',
        endHour: '09',
        endMinute: '00'
      })
    }
  }, [shiftType, open])

  const handleSave = async () => {
    const timeRange = formatTimeRange(timeData.startHour, timeData.startMinute, timeData.endHour, timeData.endMinute)

    if (!formData.name || formData.points <= 0 || formData.daysOfWeek.length === 0) {
      alert('Please fill in all fields and select at least one day')
      return
    }

    try {
      setLoading(true)
      await onSave({
        ...formData,
        time: timeRange
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving shift type:', error)
      alert('Failed to save shift type. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {shiftType ? 'Update the shift type details below.' : 'Add a new shift type to your stable.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Shift Name</Label>
            <Input
              id='name'
              placeholder='e.g., Morning Cleaning'
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className='grid gap-2'>
            <Label>Time Range</Label>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-sm text-muted-foreground'>Start Time</Label>
                <div className='flex gap-2'>
                  <Select value={timeData.startHour} onValueChange={(value) => setTimeData(prev => ({ ...prev, startHour: value }))}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Hour' />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={timeData.startMinute} onValueChange={(value) => setTimeData(prev => ({ ...prev, startMinute: value }))}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Min' />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className='space-y-2'>
                <Label className='text-sm text-muted-foreground'>End Time</Label>
                <div className='flex gap-2'>
                  <Select value={timeData.endHour} onValueChange={(value) => setTimeData(prev => ({ ...prev, endHour: value }))}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Hour' />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={timeData.endMinute} onValueChange={(value) => setTimeData(prev => ({ ...prev, endMinute: value }))}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Min' />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <p className='text-xs text-muted-foreground text-center'>
              {formatTimeRange(timeData.startHour, timeData.startMinute, timeData.endHour, timeData.endMinute)}
            </p>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='points'>Points</Label>
            <Input
              id='points'
              type='number'
              min='1'
              placeholder='e.g., 10'
              value={formData.points || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className='grid gap-2'>
            <Label>Days of Week</Label>
            <div className='grid grid-cols-2 gap-2'>
              {DAYS_OF_WEEK.map(day => (
                <div key={day.value} className='flex items-center space-x-2'>
                  <Checkbox
                    id={day.value}
                    checked={formData.daysOfWeek.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label
                    htmlFor={day.value}
                    className='text-sm font-normal cursor-pointer'
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : shiftType ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
