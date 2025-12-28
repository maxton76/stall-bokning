import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps {
  /**
   * Main title of the page
   */
  title: string

  /**
   * Optional description text below the title
   */
  description?: string

  /**
   * Optional back link configuration
   */
  backLink?: {
    /**
     * URL to navigate back to
     */
    href: string
    /**
     * Label for the back button
     */
    label: string
  }

  /**
   * Optional primary action button configuration
   */
  action?: {
    /**
     * Label for the action button
     */
    label: string
    /**
     * Optional icon to display before the label
     */
    icon?: ReactNode
    /**
     * Click handler for the action button
     */
    onClick: () => void
    /**
     * Optional button variant
     * @default 'default'
     */
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  }

  /**
   * Optional badge to display next to the title
   */
  badge?: ReactNode

  /**
   * Optional additional content to render below the title and action row
   */
  children?: ReactNode
}

/**
 * Standardized page header component
 *
 * Provides consistent layout for page titles, descriptions, back links, and actions
 * across all pages in the application.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Horse Groups"
 *   description="Manage your horse organization groups"
 *   backLink={{ href: '/stables/123', label: 'Back to Stable' }}
 *   action={{
 *     label: 'Add Group',
 *     icon: <Plus className='h-4 w-4 mr-2' />,
 *     onClick: () => openDialog()
 *   }}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  backLink,
  action,
  badge,
  children
}: PageHeaderProps) {
  return (
    <div className='space-y-4'>
      {/* Back Link */}
      {backLink && (
        <Link to={backLink.href}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            {backLink.label}
          </Button>
        </Link>
      )}

      {/* Title Row */}
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          <div className='flex items-center gap-3'>
            <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
            {badge}
          </div>
          {description && (
            <p className='text-muted-foreground mt-1'>{description}</p>
          )}
        </div>

        {/* Primary Action */}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
          >
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>

      {/* Additional Content */}
      {children}
    </div>
  )
}
