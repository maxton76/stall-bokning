import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SettingSectionProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function SettingSection({
  title,
  description,
  icon: Icon,
  children,
  action,
  className,
  contentClassName
}: SettingSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            {Icon && <Icon className='h-5 w-5' />}
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-6', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
