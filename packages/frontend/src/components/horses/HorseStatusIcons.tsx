import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Info, Home, Moon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useVaccinationStatus } from '@/hooks/useVaccinationStatus'
import type { Horse } from '@/types/roles'
import type { VaccinationStatus } from '@shared/types/vaccination'

interface HorseStatusIconsProps {
  horse: Horse
}

/**
 * Display health/vaccination status indicators for a horse
 *
 * Shows:
 * - Vaccination status (current, expiring soon, expired, no rule, no records)
 * - External horse indicator
 * - Inactive status indicator
 *
 * Each icon includes a tooltip with detailed information
 */
export function HorseStatusIcons({ horse }: HorseStatusIconsProps) {
  const { status: vaccinationStatus, loading } = useVaccinationStatus(horse)

  return (
    <div className="flex items-center gap-1">
      {/* Vaccination Status Icon */}
      {!loading && vaccinationStatus && (
        <VaccinationStatusIcon
          status={vaccinationStatus.status}
          message={vaccinationStatus.message}
        />
      )}

      {/* External Horse Icon */}
      {horse.isExternal && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Home className="h-4 w-4 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>External horse (not part of stable)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Inactive Status Icon */}
      {horse.status === 'inactive' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Moon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Inactive horse</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

/**
 * Sub-component for displaying vaccination status icon with tooltip
 */
function VaccinationStatusIcon({
  status,
  message
}: {
  status: VaccinationStatus
  message: string
}) {
  // Determine icon and color based on status
  const getIconDetails = () => {
    switch (status) {
      case 'current':
        return {
          icon: ShieldCheck,
          className: 'h-4 w-4 text-green-500',
          label: 'Vaccination current'
        }
      case 'expiring_soon':
        return {
          icon: ShieldAlert,
          className: 'h-4 w-4 text-amber-500',
          label: 'Vaccination expiring soon'
        }
      case 'expired':
        return {
          icon: ShieldX,
          className: 'h-4 w-4 text-red-500',
          label: 'Vaccination expired'
        }
      case 'no_records':
        return {
          icon: ShieldQuestion,
          className: 'h-4 w-4 text-gray-400',
          label: 'No vaccination records'
        }
      case 'no_rule':
        return {
          icon: Info,
          className: 'h-4 w-4 text-muted-foreground',
          label: 'No vaccination rule assigned'
        }
      default:
        return {
          icon: Info,
          className: 'h-4 w-4 text-muted-foreground',
          label: 'Unknown status'
        }
    }
  }

  const { icon: Icon, className, label } = getIconDetails()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={className} aria-label={label} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
