import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DropdownEmptyStateProps {
  icon: LucideIcon
  message: string
  action?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

/**
 * Shared empty state component for dropdown menus
 * Displays an icon, message, and optional action button
 */
export function DropdownEmptyState({ icon: Icon, message, action }: DropdownEmptyStateProps) {
  return (
    <div className="px-2 py-8 text-center">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-2">{message}</p>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.icon && <action.icon className="h-4 w-4 mr-1" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * Shared loading state component for dropdown menus
 * Displays a centered loading message
 */
export function DropdownLoadingState({ message }: { message: string }) {
  return (
    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

interface DropdownActionButtonsProps {
  primary: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
  secondary: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

/**
 * Shared action button group component for dropdown menus
 * Displays primary and secondary action buttons
 */
export function DropdownActionButtons({ primary, secondary }: DropdownActionButtonsProps) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <Button size="sm" onClick={primary.onClick}>
        {primary.icon && <primary.icon className="mr-1 h-3.5 w-3.5" />}
        {primary.label}
      </Button>
      <Button size="sm" variant="outline" onClick={secondary.onClick}>
        {secondary.icon && <secondary.icon className="mr-1 h-3.5 w-3.5" />}
        {secondary.label}
      </Button>
    </div>
  )
}
