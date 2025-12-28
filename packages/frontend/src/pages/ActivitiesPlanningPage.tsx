import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStables } from '@/hooks/useUserStables'
import { Badge } from '@/components/ui/badge'

export default function ActivitiesPlanningPage() {
  const { user } = useAuth()
  const [selectedStableId, setSelectedStableId] = useState<string>('')

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid)

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id)
    }
  }, [stables, selectedStableId])

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading stables...</p>
      </div>
    )
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No stables found</h3>
            <p className="text-muted-foreground">
              You need to be a member of a stable to view planning.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Planning</h1>
        <p className="text-muted-foreground mt-1">
          Calendar view of all activities, tasks, and messages
        </p>
      </div>

      {/* Stable Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Stable:</label>
            <div className="flex-1 max-w-md">
              <Select value={selectedStableId} onValueChange={setSelectedStableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stable" />
                </SelectTrigger>
                <SelectContent>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-sm">
                Coming Soon
              </Badge>
              <p className="text-muted-foreground">
                Calendar view will be integrated using FacilityCalendarView pattern
              </p>
              <p className="text-sm text-muted-foreground">
                This view will show all activities, tasks, and messages in a monthly calendar format
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
