import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Loader2Icon } from 'lucide-react'
import { format } from 'date-fns'
import { getHorseLocationHistory } from '@/services/locationHistoryService'
import type { Horse } from '@/types/roles'
import type { LocationHistory } from '@/types/roles'

interface LocationHistoryCardProps {
  horse: Horse
}

export function LocationHistoryCard({ horse }: LocationHistoryCardProps) {
  const [history, setHistory] = useState<LocationHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const data = await getHorseLocationHistory(horse.id)
        setHistory(data)
      } catch (error) {
        console.error('Failed to load location history:', error)
      } finally {
        setLoading(false)
      }
    }

    if (horse.id) {
      loadHistory()
    }
  }, [horse.id])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Location History</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No location history available
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => {
              const isCurrent = !entry.departureDate
              const isFirst = index === 0

              return (
                <div
                  key={entry.id}
                  className={`flex flex-col gap-1 p-3 rounded-lg border ${
                    isCurrent
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.stableName}</span>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Arrived:</span>{' '}
                      {format(entry.arrivalDate.toDate(), 'MMM d, yyyy')}
                    </div>
                    {entry.departureDate && (
                      <div>
                        <span className="font-medium">Departed:</span>{' '}
                        {format(entry.departureDate.toDate(), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Show current stable from horse data if no history */}
        {!loading && history.length === 0 && horse.currentStableId && (
          <div className="flex flex-col gap-1 p-3 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{horse.currentStableName}</span>
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              </div>
            </div>
            {horse.assignedAt && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Arrived:</span>{' '}
                {format(horse.assignedAt.toDate(), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
