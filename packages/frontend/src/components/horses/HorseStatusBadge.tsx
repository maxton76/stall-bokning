import type { Horse } from '@/types/roles'

interface HorseStatusBadgeProps {
  horse: Horse
}

/**
 * Display status icons for horses
 * ✅ = active status
 * 🔵 = assigned to a stable
 */
export function HorseStatusBadge({ horse }: HorseStatusBadgeProps) {
  return (
    <div className="flex gap-1">
      {horse.status === 'active' && (
        <span title="Active horse" className="text-green-600">
          ✅
        </span>
      )}
      {horse.currentStableId && (
        <span title={`Assigned to ${horse.currentStableName || 'a stable'}`} className="text-blue-600">
          🔵
        </span>
      )}
    </div>
  )
}
