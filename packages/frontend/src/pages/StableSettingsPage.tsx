import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function StableSettingsPage() {
  const { stableId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  // Mock stable data
  const [stableInfo, setStableInfo] = useState({
    name: 'Green Valley Stables',
    description: 'A friendly stable community in Stockholm',
    address: 'Vallvägen 12',
    city: 'Stockholm',
    postalCode: '123 45'
  })

  const [weightingSettings, setWeightingSettings] = useState({
    memoryHorizonDays: 90,
    resetPeriod: 'quarterly',
    pointsMultiplier: 1.0
  })

  const [schedulingSettings, setSchedulingSettings] = useState({
    scheduleHorizonDays: 14,
    autoAssignment: true,
    allowSwaps: true,
    requireApproval: false
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    shiftReminders: true,
    schedulePublished: true,
    memberJoined: true,
    shiftSwapRequests: true
  })

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // TODO: Implement actual settings update with Firestore
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIsLoading(false)
    // Show success message (toast would be nice here)
    alert('Settings saved successfully!')
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <Link to={`/stables/${stableId}`}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Stable
          </Button>
        </Link>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Stable Settings</h1>
            <p className='text-muted-foreground mt-1'>Manage your stable configuration and preferences</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            <Save className='mr-2 h-4 w-4' />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue='general' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='weighting'>Weighting System</TabsTrigger>
          <TabsTrigger value='scheduling'>Scheduling</TabsTrigger>
          <TabsTrigger value='notifications'>Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value='general' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Stable Information</CardTitle>
              <CardDescription>Basic information about your stable</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Stable Name</Label>
                <Input
                  id='name'
                  value={stableInfo.name}
                  onChange={(e) => setStableInfo({ ...stableInfo, name: e.target.value })}
                  placeholder='e.g. Green Valley Stables'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <Textarea
                  id='description'
                  value={stableInfo.description}
                  onChange={(e) => setStableInfo({ ...stableInfo, description: e.target.value })}
                  placeholder='Brief description of your stable...'
                  rows={3}
                />
              </div>

              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2'>
                  <Label htmlFor='address'>Street Address</Label>
                  <Input
                    id='address'
                    value={stableInfo.address}
                    onChange={(e) => setStableInfo({ ...stableInfo, address: e.target.value })}
                    placeholder='e.g. Vallvägen 12'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='city'>City</Label>
                  <Input
                    id='city'
                    value={stableInfo.city}
                    onChange={(e) => setStableInfo({ ...stableInfo, city: e.target.value })}
                    placeholder='e.g. Stockholm'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='postalCode'>Postal Code</Label>
                  <Input
                    id='postalCode'
                    value={stableInfo.postalCode}
                    onChange={(e) => setStableInfo({ ...stableInfo, postalCode: e.target.value })}
                    placeholder='e.g. 123 45'
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weighting System Tab */}
        <TabsContent value='weighting' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Fairness Algorithm</CardTitle>
              <CardDescription>
                Configure how the system calculates fairness scores and distributes shifts
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-2'>
                <Label htmlFor='memoryHorizon'>Memory Horizon (days)</Label>
                <Input
                  id='memoryHorizon'
                  type='number'
                  value={weightingSettings.memoryHorizonDays}
                  onChange={(e) =>
                    setWeightingSettings({
                      ...weightingSettings,
                      memoryHorizonDays: parseInt(e.target.value)
                    })
                  }
                  min='30'
                  max='365'
                />
                <p className='text-sm text-muted-foreground'>
                  How far back to consider shift history when calculating fairness (30-365 days)
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='resetPeriod'>Reset Period</Label>
                <select
                  id='resetPeriod'
                  value={weightingSettings.resetPeriod}
                  onChange={(e) =>
                    setWeightingSettings({ ...weightingSettings, resetPeriod: e.target.value })
                  }
                  className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                >
                  <option value='monthly'>Monthly</option>
                  <option value='quarterly'>Quarterly</option>
                  <option value='yearly'>Yearly</option>
                  <option value='never'>Never</option>
                </select>
                <p className='text-sm text-muted-foreground'>
                  How often to reset shift point counters
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='pointsMultiplier'>Points Multiplier</Label>
                <Input
                  id='pointsMultiplier'
                  type='number'
                  step='0.1'
                  value={weightingSettings.pointsMultiplier}
                  onChange={(e) =>
                    setWeightingSettings({
                      ...weightingSettings,
                      pointsMultiplier: parseFloat(e.target.value)
                    })
                  }
                  min='0.1'
                  max='5.0'
                />
                <p className='text-sm text-muted-foreground'>
                  Global multiplier for all shift points (0.1-5.0)
                </p>
              </div>

              <div className='rounded-lg bg-muted p-4'>
                <h4 className='font-medium mb-2'>Fairness Algorithm Preview</h4>
                <p className='text-sm text-muted-foreground'>
                  With current settings, the system will consider the last{' '}
                  <strong>{weightingSettings.memoryHorizonDays} days</strong> of shift history and reset
                  counters <strong>{weightingSettings.resetPeriod}</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling Tab */}
        <TabsContent value='scheduling' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Preferences</CardTitle>
              <CardDescription>Configure how schedules are created and managed</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-2'>
                <Label htmlFor='scheduleHorizon'>Schedule Horizon (days)</Label>
                <Input
                  id='scheduleHorizon'
                  type='number'
                  value={schedulingSettings.scheduleHorizonDays}
                  onChange={(e) =>
                    setSchedulingSettings({
                      ...schedulingSettings,
                      scheduleHorizonDays: parseInt(e.target.value)
                    })
                  }
                  min='7'
                  max='90'
                />
                <p className='text-sm text-muted-foreground'>
                  How many days in advance to create schedules (7-90 days)
                </p>
              </div>

              <div className='flex items-center justify-between space-x-2'>
                <div className='space-y-0.5'>
                  <Label htmlFor='autoAssignment'>Automatic Shift Assignment</Label>
                  <p className='text-sm text-muted-foreground'>
                    Use fairness algorithm to automatically assign shifts
                  </p>
                </div>
                <Switch
                  id='autoAssignment'
                  checked={schedulingSettings.autoAssignment}
                  onCheckedChange={(checked) =>
                    setSchedulingSettings({ ...schedulingSettings, autoAssignment: checked })
                  }
                />
              </div>

              <div className='flex items-center justify-between space-x-2'>
                <div className='space-y-0.5'>
                  <Label htmlFor='allowSwaps'>Allow Shift Swaps</Label>
                  <p className='text-sm text-muted-foreground'>
                    Members can request to swap shifts with each other
                  </p>
                </div>
                <Switch
                  id='allowSwaps'
                  checked={schedulingSettings.allowSwaps}
                  onCheckedChange={(checked) =>
                    setSchedulingSettings({ ...schedulingSettings, allowSwaps: checked })
                  }
                />
              </div>

              <div className='flex items-center justify-between space-x-2'>
                <div className='space-y-0.5'>
                  <Label htmlFor='requireApproval'>Require Owner Approval</Label>
                  <p className='text-sm text-muted-foreground'>
                    Shift swaps must be approved by stable owner
                  </p>
                </div>
                <Switch
                  id='requireApproval'
                  checked={schedulingSettings.requireApproval}
                  onCheckedChange={(checked) =>
                    setSchedulingSettings({ ...schedulingSettings, requireApproval: checked })
                  }
                  disabled={!schedulingSettings.allowSwaps}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value='notifications' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which events trigger email notifications</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between space-x-2'>
                <div className='space-y-0.5'>
                  <Label htmlFor='emailNotifications'>Email Notifications</Label>
                  <p className='text-sm text-muted-foreground'>Master switch for all email notifications</p>
                </div>
                <Switch
                  id='emailNotifications'
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                  }
                />
              </div>

              <div className='border-t pt-4 space-y-4'>
                <p className='text-sm font-medium'>Send notifications for:</p>

                <div className='flex items-center justify-between space-x-2'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='shiftReminders'>Upcoming Shift Reminders</Label>
                    <p className='text-sm text-muted-foreground'>
                      Remind members about their shifts 24 hours in advance
                    </p>
                  </div>
                  <Switch
                    id='shiftReminders'
                    checked={notificationSettings.shiftReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, shiftReminders: checked })
                    }
                    disabled={!notificationSettings.emailNotifications}
                  />
                </div>

                <div className='flex items-center justify-between space-x-2'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='schedulePublished'>Schedule Published</Label>
                    <p className='text-sm text-muted-foreground'>
                      Notify members when a new schedule is published
                    </p>
                  </div>
                  <Switch
                    id='schedulePublished'
                    checked={notificationSettings.schedulePublished}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, schedulePublished: checked })
                    }
                    disabled={!notificationSettings.emailNotifications}
                  />
                </div>

                <div className='flex items-center justify-between space-x-2'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='memberJoined'>New Member Joined</Label>
                    <p className='text-sm text-muted-foreground'>
                      Notify owners when a new member joins the stable
                    </p>
                  </div>
                  <Switch
                    id='memberJoined'
                    checked={notificationSettings.memberJoined}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, memberJoined: checked })
                    }
                    disabled={!notificationSettings.emailNotifications}
                  />
                </div>

                <div className='flex items-center justify-between space-x-2'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='shiftSwapRequests'>Shift Swap Requests</Label>
                    <p className='text-sm text-muted-foreground'>
                      Notify when members request shift swaps
                    </p>
                  </div>
                  <Switch
                    id='shiftSwapRequests'
                    checked={notificationSettings.shiftSwapRequests}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, shiftSwapRequests: checked })
                    }
                    disabled={!notificationSettings.emailNotifications}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
