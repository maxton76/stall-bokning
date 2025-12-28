import { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

/**
 * Props for the AsyncDataBoundary component
 */
export interface AsyncDataBoundaryProps<T> {
  /**
   * Data to render
   */
  data: T | null | undefined

  /**
   * Loading state
   */
  loading: boolean

  /**
   * Error state
   */
  error: Error | null

  /**
   * Optional custom loading component
   */
  loadingComponent?: ReactNode

  /**
   * Optional custom error component renderer
   */
  errorComponent?: (error: Error) => ReactNode

  /**
   * Optional custom empty state component
   */
  emptyComponent?: ReactNode

  /**
   * Render function for successful data state
   */
  children: (data: T) => ReactNode
}

/**
 * Async Data Boundary Component
 *
 * Standardizes loading, error, and empty states for asynchronous data.
 * Reduces boilerplate code by handling common data fetching scenarios.
 *
 * @example
 * ```tsx
 * const organization = useAsyncData({
 *   loadFn: async () => await getOrganization(orgId)
 * })
 *
 * return (
 *   <AsyncDataBoundary
 *     data={organization.data}
 *     loading={organization.loading}
 *     error={organization.error}
 *   >
 *     {(org) => (
 *       <div>
 *         <h1>{org.name}</h1>
 *         <p>{org.description}</p>
 *       </div>
 *     )}
 *   </AsyncDataBoundary>
 * )
 * ```
 */
export function AsyncDataBoundary<T>({
  data,
  loading,
  error,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children
}: AsyncDataBoundaryProps<T>) {
  // Loading State
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        )}
      </>
    )
  }

  // Error State
  if (error) {
    return (
      <>
        {errorComponent?.(error) || (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>
        )}
      </>
    )
  }

  // Empty/No Data State
  if (!data) {
    return (
      <>
        {emptyComponent || (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>No data available</p>
          </div>
        )}
      </>
    )
  }

  // Success State - Render children with data
  return <>{children(data)}</>
}

/**
 * Simple loading spinner component
 *
 * @example
 * ```tsx
 * <AsyncDataBoundary
 *   data={data}
 *   loading={loading}
 *   error={error}
 *   loadingComponent={<LoadingSpinner />}
 * >
 *   {(data) => <div>{data.name}</div>}
 * </AsyncDataBoundary>
 * ```
 */
export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className='flex flex-col items-center justify-center py-12 space-y-4'>
      <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      {message && <p className='text-sm text-muted-foreground'>{message}</p>}
    </div>
  )
}

/**
 * Simple error alert component
 *
 * @example
 * ```tsx
 * <AsyncDataBoundary
 *   data={data}
 *   loading={loading}
 *   error={error}
 *   errorComponent={(err) => <ErrorAlert error={err} />}
 * >
 *   {(data) => <div>{data.name}</div>}
 * </AsyncDataBoundary>
 * ```
 */
export function ErrorAlert({ error, title }: { error: Error; title?: string }) {
  return (
    <Alert variant='destructive'>
      <AlertCircle className='h-4 w-4' />
      <AlertTitle>{title || 'Error'}</AlertTitle>
      <AlertDescription>
        {error.message || 'An unexpected error occurred'}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Simple empty state component
 *
 * @example
 * ```tsx
 * <AsyncDataBoundary
 *   data={data}
 *   loading={loading}
 *   error={error}
 *   emptyComponent={<EmptyState message="No items found" />}
 * >
 *   {(data) => <div>{data.name}</div>}
 * </AsyncDataBoundary>
 * ```
 */
export function EmptyState({
  icon,
  message,
  action
}: {
  icon?: ReactNode
  message: string
  action?: ReactNode
}) {
  return (
    <div className='text-center py-12 space-y-4'>
      {icon && <div className='flex justify-center'>{icon}</div>}
      <p className='text-muted-foreground'>{message}</p>
      {action && <div className='flex justify-center'>{action}</div>}
    </div>
  )
}
