import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import type { Horse } from '@/types/roles'

interface TeamCardProps {
  horse: Horse
}

export function TeamCard({ horse }: TeamCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Team</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Owner Section */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Owner</h3>
          {horse.ownerName || horse.ownerEmail ? (
            <div className="rounded-lg border p-3">
              {horse.ownerName && (
                <p className="font-medium">{horse.ownerName}</p>
              )}
              {horse.ownerEmail && (
                <p className="text-sm text-muted-foreground">
                  {horse.ownerEmail}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Owner information not available
            </p>
          )}
        </div>

        {/* Team Assignments Placeholder */}
        <div className="border-t pt-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Team Assignments
            </p>
            <p className="text-xs text-muted-foreground">
              Rider, Groom, Farrier, Vet, and Trainer assignments coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
