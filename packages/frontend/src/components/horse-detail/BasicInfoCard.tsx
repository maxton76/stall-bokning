import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Share, Trash2, Edit, Copy, Check } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { HORSE_USAGE_OPTIONS } from '@/constants/horseConstants'
import type { Horse, HorseUsage } from '@/types/roles'
import type { Timestamp } from 'firebase/firestore'

interface BasicInfoCardProps {
  horse: Horse
  onEdit?: () => void      // Edit handler
  onShare?: () => void     // Future feature
  onRemove?: () => void    // Future feature
}

export function BasicInfoCard({ horse, onEdit, onShare, onRemove }: BasicInfoCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Copy to clipboard handler
  const handleCopy = async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  // Helper function to render usage badges
  const renderUsageBadge = (usage: HorseUsage) => {
    const config = HORSE_USAGE_OPTIONS.find(opt => opt.value === usage)
    if (!config) return null

    return (
      <Badge
        key={usage}
        variant="outline"
        className={cn(
          "text-xs",
          usage === 'care' && "border-purple-300 text-purple-700 bg-purple-50",
          usage === 'sport' && "border-green-300 text-green-700 bg-green-50",
          usage === 'breeding' && "border-amber-300 text-amber-700 bg-amber-50"
        )}
      >
        {config.icon} {config.label}
      </Badge>
    )
  }

  // Helper function to get FEI expiry warning
  const getFeiExpiryWarning = (expiryDate: Timestamp) => {
    const daysUntilExpiry = differenceInDays(expiryDate.toDate(), new Date())

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>
    }
    if (daysUntilExpiry <= 60) {
      return <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
        Expires soon
      </Badge>
    }
    return null
  }

  // Conditional flags
  const hasIdentification = !!(horse.ueln || horse.chipNumber || horse.federationNumber || horse.feiPassNumber || horse.feiExpiryDate)
  const hasPedigree = !!(horse.sire || horse.dam || horse.damsire || horse.breeder)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          {/* Left: Avatar + Name + Badges */}
          <div className="flex gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{horse.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{horse.name}</CardTitle>
              {/* Pedigree subtitle: "Sire × Dam" */}
              {(horse.sire || horse.dam) && (
                <p className="text-sm text-muted-foreground">
                  {horse.sire && horse.dam ? `${horse.sire} × ${horse.dam}` : horse.sire || horse.dam}
                </p>
              )}
              {/* Usage badges */}
              {horse.usage && horse.usage.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {horse.usage.map(usage => renderUsageBadge(usage))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" disabled title="Share (coming soon)">
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled title="Remove (coming soon)">
              <Trash2 className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} title="Edit horse">
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. Basic Info Grid (3 columns) */}
        <div className="grid grid-cols-3 gap-4">
          {horse.gender && (
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium capitalize">{horse.gender}</p>
            </div>
          )}
          {horse.color && (
            <div>
              <p className="text-sm text-muted-foreground">Color</p>
              <p className="font-medium">{horse.color}</p>
            </div>
          )}
          {horse.studbook && (
            <div>
              <p className="text-sm text-muted-foreground">Studbook</p>
              <p className="font-medium">{horse.studbook}</p>
            </div>
          )}
        </div>

        {/* 2. Birth Info */}
        {(horse.dateOfBirth || horse.horseGroupName) && (
          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            {horse.dateOfBirth && (
              <div>
                <p className="text-sm text-muted-foreground">Date of birth</p>
                <p className="font-medium">
                  {format(horse.dateOfBirth.toDate(), 'M/d/yy')}
                  {horse.age && ` (${horse.age} years)`}
                </p>
              </div>
            )}
            {horse.horseGroupName && (
              <div>
                <p className="text-sm text-muted-foreground">Group</p>
                <p className="font-medium">{horse.horseGroupName}</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Expanded Identification (5 fields with FEI expiry warning) */}
        {hasIdentification && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Identification</h3>
            <div className="grid grid-cols-3 gap-4">
              {horse.ueln && (
                <div>
                  <p className="text-sm text-muted-foreground">UELN</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.ueln}</p>
                    <button
                      onClick={() => handleCopy(horse.ueln!, 'ueln')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'ueln' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.chipNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Chip number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.chipNumber}</p>
                    <button
                      onClick={() => handleCopy(horse.chipNumber!, 'chipNumber')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'chipNumber' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.federationNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Federation</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.federationNumber}</p>
                    <button
                      onClick={() => handleCopy(horse.federationNumber!, 'federationNumber')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'federationNumber' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.feiPassNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">FEI Pass</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.feiPassNumber}</p>
                    <button
                      onClick={() => handleCopy(horse.feiPassNumber!, 'feiPassNumber')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'feiPassNumber' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.feiExpiryDate && (
                <div>
                  <p className="text-sm text-muted-foreground">FEI Expiry</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">
                      {format(horse.feiExpiryDate.toDate(), 'M/d/yy')}
                    </p>
                    {getFeiExpiryWarning(horse.feiExpiryDate)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Pedigree (with Breeder) */}
        {hasPedigree && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">Pedigree</p>
            <div className="space-y-1 text-sm">
              {horse.sire && (
                <div>
                  <span className="text-muted-foreground">Sire: </span>
                  <span>{horse.sire}</span>
                </div>
              )}
              {horse.dam && (
                <div>
                  <span className="text-muted-foreground">Dam: </span>
                  <span>{horse.dam}</span>
                </div>
              )}
              {horse.damsire && (
                <div>
                  <span className="text-muted-foreground">Damsire: </span>
                  <span>{horse.damsire}</span>
                </div>
              )}
              {horse.breeder && (
                <div>
                  <span className="text-muted-foreground">Breeder: </span>
                  <span>{horse.breeder}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Physical Characteristics */}
        {horse.withersHeight && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Withers Height</p>
            <p className="font-medium">{horse.withersHeight} cm</p>
          </div>
        )}

        {/* 6. Notes */}
        {horse.notes && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{horse.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
