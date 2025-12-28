import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStables } from '@/hooks/useUserStables'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getCareActivities } from '@/services/activityService'
import type { Activity } from '@/types/activity'
import { ACTIVITY_TYPES } from '@/types/activity'

export default function ActivitiesCarePage() {
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

  // Load care activities for selected stable
  const activities = useAsyncData<Activity[]>({
    loadFn: async () => {
      if (!selectedStableId) return []
      return await getCareActivities(selectedStableId)
    },
  })

  // Reload activities when stable changes
  useEffect(() => {
    if (selectedStableId) {
      activities.load()
    }
  }, [selectedStableId])

  // Group activities by horse
  const groupedByHorse = (activities.data || []).reduce((acc, activity) => {
    if (!acc[activity.horseName]) {
      acc[activity.horseName] = []
    }
    acc[activity.horseName]!.push(activity)
    return acc
  }, {} as Record<string, Activity[]>)

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
              You need to be a member of a stable to view care activities.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Heart className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Care Activities</h1>
          <p className="text-muted-foreground mt-1">
            Veterinary, farrier, dentist, and other care-related activities
          </p>
        </div>
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

      {/* Care Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>Care Schedule by Horse ({activities.data?.length || 0} activities)</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading care activities...</p>
            </div>
          ) : Object.keys(groupedByHorse).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No care activities scheduled. Add care activities from the Action List page.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByHorse).map(([horseName, horseActivities]) => (
                <div key={horseName} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">{horseName}</h3>
                  <div className="space-y-2">
                    {horseActivities.map((activity) => {
                      const activityTypeConfig = ACTIVITY_TYPES.find(
                        (t) => t.value === activity.activityType
                      )
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 bg-accent/50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{activityTypeConfig?.icon || '📝'}</span>
                            <div>
                              <p className="font-medium">{activityTypeConfig?.label || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(activity.date.toDate(), 'PPP')}
                              </p>
                              {activity.note && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.note}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activity.status === 'completed' ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline">Scheduled</Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
