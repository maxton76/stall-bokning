import { Plug, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OrganizationIntegrationsPage() {

  // Placeholder integrations data
  const availableIntegrations = [
    {
      id: '1',
      name: 'SendGrid',
      description: 'Email delivery and marketing automation',
      icon: '📧',
      status: 'available' as const,
      category: 'Email'
    },
    {
      id: '2',
      name: 'Twilio',
      description: 'SMS and voice communication',
      icon: '📱',
      status: 'available' as const,
      category: 'Communication'
    },
    {
      id: '3',
      name: 'Stripe',
      description: 'Payment processing and subscriptions',
      icon: '💳',
      status: 'connected' as const,
      category: 'Payments'
    },
    {
      id: '4',
      name: 'Google Calendar',
      description: 'Calendar synchronization',
      icon: '📅',
      status: 'available' as const,
      category: 'Calendar'
    }
  ]

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Integrations</h1>
          <p className='text-muted-foreground mt-1'>
            Connect external services to extend your organization's capabilities
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {availableIntegrations.map((integration) => (
          <Card key={integration.id} className='hover:shadow-lg transition-shadow'>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='text-4xl'>{integration.icon}</div>
                  <div>
                    <CardTitle className='text-xl'>{integration.name}</CardTitle>
                    <Badge variant='outline' className='mt-1'>
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                {integration.status === 'connected' ? (
                  <Badge variant='default'>Connected</Badge>
                ) : (
                  <Badge variant='secondary'>Available</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className='mb-4'>
                {integration.description}
              </CardDescription>
              {integration.status === 'connected' ? (
                <div className='flex gap-2'>
                  <Button variant='outline' size='sm' className='flex-1'>
                    Configure
                  </Button>
                  <Button variant='ghost' size='sm'>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button variant='default' size='sm' className='w-full'>
                  <Plus className='h-4 w-4 mr-2' />
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for Custom Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Integrations</CardTitle>
          <CardDescription>
            Build your own integrations using our API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <Plug className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-sm text-muted-foreground mb-4'>
              No custom integrations configured yet
            </p>
            <Button>
              <Plus className='h-4 w-4 mr-2' />
              Create Custom Integration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
