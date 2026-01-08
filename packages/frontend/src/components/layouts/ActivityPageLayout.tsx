import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ActivityPageLayoutProps {
  icon: LucideIcon
  title: string
  description: string
  selectedStableId: string
  onStableChange: (stableId: string) => void
  stables: Array<{ id: string; name: string }>
  stablesLoading?: boolean
  showStableSelector?: boolean
  children: ReactNode
}

export function ActivityPageLayout({
  icon: Icon,
  title,
  description,
  selectedStableId,
  onStableChange,
  stables,
  stablesLoading = false,
  showStableSelector = true,
  children,
}: ActivityPageLayoutProps) {
  // Loading state
  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading stables...</p>
      </div>
    )
  }

  // No stables state
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No stables found</h3>
            <p className="text-muted-foreground">
              You need to be a member of a stable to view activities.
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
        <Icon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {/* Stable Selector Bar */}
      {showStableSelector && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Stable:</label>
          <Select value={selectedStableId} onValueChange={onStableChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a stable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stables</SelectItem>
              {stables.map((stable) => (
                <SelectItem key={stable.id} value={stable.id}>
                  {stable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Page Content */}
      {children}
    </div>
  )
}
