import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { MoveHorseDialog } from '@/components/MoveHorseDialog'
import type { Horse } from '@/types/roles'

interface LocationCardProps {
  horse: Horse
  onUpdate: () => void
}

export function LocationCard({ horse, onUpdate }: LocationCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // Determine current location status
  const getCurrentLocation = () => {
    // External location takes priority
    if (horse.externalLocation) {
      return {
        location: horse.externalLocation,
        type: 'external',
        moveType: horse.externalMoveType,
        since: horse.externalDepartureDate
      }
    }

    // Then check stable assignment
    if (horse.currentStableId) {
      return {
        location: horse.currentStableName || 'Own stable',
        type: 'stable',
        since: horse.assignedAt
      }
    }

    // No location info
    return {
      location: 'Unknown',
      type: 'unknown'
    }
  }

  const currentLocation = getCurrentLocation()

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Location</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Current Location Display */}
            <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {currentLocation.location}
                  </span>

                  {/* Badge for external moves */}
                  {currentLocation.type === 'external' && currentLocation.moveType && (
                    <Badge
                      variant={currentLocation.moveType === 'temporary' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {currentLocation.moveType === 'temporary' ? 'Temporary away' : 'Permanent'}
                    </Badge>
                  )}

                  {/* Badge for stable */}
                  {currentLocation.type === 'stable' && (
                    <Badge variant="outline" className="text-xs">
                      At stable
                    </Badge>
                  )}
                </div>
              </div>

              {/* Date info */}
              {currentLocation.since && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">
                    {currentLocation.type === 'external' ? 'Departed' : 'Since'}:
                  </span>{' '}
                  {format(currentLocation.since.toDate(), 'MMM d, yyyy')}
                </div>
              )}

              {/* Reason for permanent moves */}
              {currentLocation.type === 'external' &&
               currentLocation.moveType === 'permanent' &&
               horse.externalMoveReason && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Reason:</span>{' '}
                  {horse.externalMoveReason.charAt(0).toUpperCase() + horse.externalMoveReason.slice(1)}
                </div>
              )}
            </div>

            {/* Move Horse Button */}
            <Button
              onClick={() => setDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              Move horse
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Move Horse Dialog */}
      <MoveHorseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        horse={horse}
        onSuccess={() => {
          setDialogOpen(false)
          onUpdate()
        }}
      />
    </>
  )
}
