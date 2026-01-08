import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from 'lucide-react'
import type { Horse } from '@/types/roles'

interface OwnershipCardProps {
  horse: Horse
}

export function OwnershipCard({ horse }: OwnershipCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Ownership</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {horse.ownerName || horse.ownerEmail ? (
            <div className="flex flex-col gap-1">
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

          {/* Placeholder for future co-ownership feature */}
          {false && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-muted-foreground italic">
                Co-ownership tracking coming soon
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
