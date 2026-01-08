import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocationHistory } from '@/hooks/useLocationHistory'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getUserHorses } from '@/services/horseService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'
import type { LocationHistoryDisplay } from '@/types/roles'

type SortField = 'arrivalDate' | 'departureDate'
type SortOrder = 'asc' | 'desc'

export default function LocationHistoryPage() {
  const { user } = useAuth()
  const [selectedHorseId, setSelectedHorseId] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('arrivalDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Load user's horses for the dropdown
  const { data: horses = [], loading: horsesLoading } = useAsyncData({
    loadFn: () => getUserHorses(user!.uid)
  })

  // Load location history
  const { history, loading, error } = useLocationHistory(selectedHorseId)

  // Sort history
  const sortedHistory = [...history].sort((a, b) => {
    let aValue: Date | undefined
    let bValue: Date | undefined

    if (sortField === 'arrivalDate') {
      aValue = a.arrivalDate
      bValue = b.arrivalDate
    } else {
      aValue = a.departureDate
      bValue = b.departureDate
    }

    // Handle undefined values (put them at the end)
    if (!aValue && !bValue) return 0
    if (!aValue) return 1
    if (!bValue) return -1

    const comparison = aValue.getTime() - bValue.getTime()
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with descending order
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Location History</h1>
        <p className="text-muted-foreground mt-2">
          Track your horses' movements between stables and external locations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Movement History</CardTitle>
              <CardDescription>
                View arrival and departure records for your horses
              </CardDescription>
            </div>
            <div className="w-[250px]">
              <Select
                value={selectedHorseId}
                onValueChange={setSelectedHorseId}
                disabled={horsesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select horse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Horses</SelectItem>
                  {horses?.map(horse => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading location history...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading location history: {error.message}
            </div>
          ) : sortedHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg mb-2">No location history found</p>
              <p className="text-sm">
                Location history will be created when horses are assigned to stables or moved to external locations
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horse</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('arrivalDate')}
                        className="h-8 p-0 hover:bg-transparent"
                      >
                        Arrival
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('departureDate')}
                        className="h-8 p-0 hover:bg-transparent"
                      >
                        Departure
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.map((entry: LocationHistoryDisplay) => {
                    const isExternal = entry.locationType === 'external'
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.horseName}
                        </TableCell>
                        <TableCell>
                          {isExternal ? (
                            <Badge variant="outline">External</Badge>
                          ) : (
                            <Badge variant="secondary">Stable</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isExternal ? (
                            <div>
                              <div className="font-medium">{entry.externalLocation}</div>
                              {entry.externalMoveType && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {entry.externalMoveType === 'temporary' ? 'Temporary' : 'Permanent'}
                                </Badge>
                              )}
                              {entry.externalMoveReason && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Reason: {entry.externalMoveReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            entry.stableName
                          )}
                        </TableCell>
                        <TableCell>{formatDate(entry.arrivalDate)}</TableCell>
                        <TableCell>
                          {entry.departureDate ? (
                            formatDate(entry.departureDate)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.isCurrentLocation ? (
                            <Badge variant="default">Current Location</Badge>
                          ) : (
                            <Badge variant="secondary">Past Location</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
