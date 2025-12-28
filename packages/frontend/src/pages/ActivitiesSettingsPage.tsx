import { useState } from 'react'
import { Settings, Palette, Bell, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ACTIVITY_TYPES, DEFAULT_COLORS } from '@/types/activity'

export default function ActivitiesSettingsPage() {

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailReminders: true,
    activityAssigned: true,
    taskCompleted: false,
    careActivityDue: true,
    dailyDigest: false,
  })

  // Color preferences
  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    DEFAULT_COLORS[0],
    DEFAULT_COLORS[1],
    DEFAULT_COLORS[2],
  ])

  const handleNotificationChange = (key: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }

  const toggleFavoriteColor = (color: string) => {
    setFavoriteColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure activity types, notifications, and preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Types Reference */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-fit">
                Reference
              </Badge>
            </div>
            <CardTitle>Activity Types</CardTitle>
            <CardDescription>
              Available activity types for horse-related activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-3">
                Care Activities
              </div>
              <div className="space-y-2">
                {ACTIVITY_TYPES.filter(type => type.isCare).map(type => (
                  <div
                    key={type.value}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{type.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground mt-6 mb-3">
                Other Activities
              </div>
              <div className="space-y-2">
                {ACTIVITY_TYPES.filter(type => !type.isCare).map(type => (
                  <div
                    key={type.value}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{type.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Configure how you receive activity notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-reminders">Email Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email reminders for upcoming activities
                </p>
              </div>
              <Switch
                id="email-reminders"
                checked={notificationSettings.emailReminders}
                onCheckedChange={() => handleNotificationChange('emailReminders')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="activity-assigned">Activity Assigned</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when an activity is assigned to you
                </p>
              </div>
              <Switch
                id="activity-assigned"
                checked={notificationSettings.activityAssigned}
                onCheckedChange={() => handleNotificationChange('activityAssigned')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="task-completed">Task Completed</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when tasks you created are completed
                </p>
              </div>
              <Switch
                id="task-completed"
                checked={notificationSettings.taskCompleted}
                onCheckedChange={() => handleNotificationChange('taskCompleted')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="care-activity-due">Care Activity Due</Label>
                <p className="text-sm text-muted-foreground">
                  Remind when care activities are approaching
                </p>
              </div>
              <Switch
                id="care-activity-due"
                checked={notificationSettings.careActivityDue}
                onCheckedChange={() => handleNotificationChange('careActivityDue')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-digest">Daily Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of activities
                </p>
              </div>
              <Switch
                id="daily-digest"
                checked={notificationSettings.dailyDigest}
                onCheckedChange={() => handleNotificationChange('dailyDigest')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Color Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Color Preferences</CardTitle>
            <CardDescription>
              Select favorite colors for tasks and messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Favorite Colors ({favoriteColors.length} selected)
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => toggleFavoriteColor(color)}
                      className={`
                        w-10 h-10 rounded-md border-2 transition-all
                        ${favoriteColors.includes(color)
                          ? 'border-primary ring-2 ring-primary/20 scale-110'
                          : 'border-gray-300 hover:scale-105'
                        }
                      `}
                      style={{ backgroundColor: color }}
                      title={color}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Selected colors will appear first when creating tasks or messages.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Assignees */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Default Assignees</CardTitle>
            <CardDescription>
              Configure default assignment preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-assign-self">Auto-assign to self</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign created activities to yourself
                  </p>
                </div>
                <Switch id="auto-assign-self" />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  You can always change the assignee when creating activities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-muted-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">About Activity Settings</p>
              <p className="text-sm text-muted-foreground">
                These settings are saved automatically and apply to all activities across your stables.
                Activity types are predefined to ensure consistency across the platform.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
