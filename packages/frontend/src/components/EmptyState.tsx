import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Props for EmptyState component
 */
interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Optional action button */
  action?: {
    /** Button label */
    label: string
    /** Click handler */
    onClick: () => void
  }
}

/**
 * Reusable empty state component
 * Standardizes empty state UI across all components
 *
 * @example
 * ```tsx
 * // Before: 15 lines for each empty state
 * <Card>
 *   <CardContent className='flex flex-col items-center justify-center py-12'>
 *     <HorseIcon className='h-12 w-12 text-muted-foreground mb-4' />
 *     <h3 className='text-lg font-semibold mb-2'>No horses yet</h3>
 *     <p className='text-muted-foreground text-center mb-4'>Add your first horse to get started</p>
 *     <Button onClick={handleCreateHorse}><Plus className='mr-2 h-4 w-4' />Add Horse</Button>
 *   </CardContent>
 * </Card>
 *
 * // After: 1 component call
 * <EmptyState
 *   icon={HorseIcon}
 *   title="No horses yet"
 *   description="Add your first horse to get started"
 *   action={{ label: 'Add Horse', onClick: handleCreateHorse }}
 * />
 * ```
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className='flex flex-col items-center justify-center py-12'>
        <Icon className='h-12 w-12 text-muted-foreground mb-4' />
        <h3 className='text-lg font-semibold mb-2'>{title}</h3>
        <p className='text-muted-foreground text-center mb-4'>{description}</p>
        {action && (
          <Button onClick={action.onClick}>{action.label}</Button>
        )}
      </CardContent>
    </Card>
  )
}
