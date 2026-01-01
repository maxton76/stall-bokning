import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { FilterBadge } from '@shared/types/filters'

interface HorseFilterBadgesProps {
  /** Array of active filter badges */
  badges: FilterBadge[]

  /** Optional callback to clear all filters */
  onClearAll?: () => void
}

export function HorseFilterBadges({ badges, onClearAll }: HorseFilterBadgesProps) {
  if (badges.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge) => (
        <Badge key={badge.key} variant="secondary" className="gap-1.5 pr-1">
          <span className="text-xs">
            {badge.label}: {badge.value}
          </span>
          <button
            onClick={badge.onRemove}
            className="ml-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            aria-label={`Remove ${badge.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {badges.length > 1 && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs gap-1.5"
        >
          <X className="h-3 w-3" />
          Clear all
        </Button>
      )}
    </div>
  )
}
