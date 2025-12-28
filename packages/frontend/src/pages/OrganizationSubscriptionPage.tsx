import { CreditCard, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function OrganizationSubscriptionPage() {

  // Placeholder subscription data
  const subscription = {
    plan: 'Professional',
    status: 'trial',
    trialDaysLeft: 21,
    price: '299 kr/month',
    features: [
      'Up to 50 members',
      'Unlimited stables',
      'Advanced scheduling',
      'Priority support',
      'Custom integrations',
      'Detailed analytics'
    ]
  }

  const billingDetails = {
    name: 'John Doe',
    phone: '+46 70 123 45 67',
    street: 'Storgatan 12',
    postcode: '123 45',
    city: 'Stockholm',
    country: 'Sweden'
  }

  const paymentMethod = {
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: '12',
    expiryYear: '2025'
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Subscription</h1>
        <p className='text-muted-foreground mt-1'>
          Manage your subscription and billing information
        </p>
      </div>

      {/* Trial Status Alert */}
      {subscription.status === 'trial' && (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Trial Period</AlertTitle>
          <AlertDescription>
            Your subscription is currently in trial with all features. You have{' '}
            <strong>{subscription.trialDaysLeft} days</strong> left to test all features.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Your current subscription tier and features
              </CardDescription>
            </div>
            <Badge variant='default' className='text-lg px-4 py-2'>
              {subscription.plan}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-baseline gap-2'>
              <span className='text-3xl font-bold'>{subscription.price}</span>
              <span className='text-muted-foreground'>
                {subscription.status === 'trial' ? '(after trial)' : ''}
              </span>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-semibold'>Included features:</p>
              <ul className='space-y-2'>
                {subscription.features.map((feature, index) => (
                  <li key={index} className='flex items-center gap-2 text-sm'>
                    <Check className='h-4 w-4 text-green-600' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className='flex gap-2 pt-4'>
              <Button variant='outline'>Change Plan</Button>
              {subscription.status === 'trial' && (
                <Button>Upgrade Now</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Details */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Billing Details</CardTitle>
              <CardDescription>
                Your billing and contact information
              </CardDescription>
            </div>
            <Button variant='outline' size='sm'>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input value={billingDetails.name} disabled />
            </div>
            <div className='space-y-2'>
              <Label>Phone number</Label>
              <Input value={billingDetails.phone} disabled />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label>Street</Label>
              <Input value={billingDetails.street} disabled />
            </div>
            <div className='space-y-2'>
              <Label>Postcode</Label>
              <Input value={billingDetails.postcode} disabled />
            </div>
            <div className='space-y-2'>
              <Label>City</Label>
              <Input value={billingDetails.city} disabled />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label>Country</Label>
              <Input value={billingDetails.country} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Manage your payment information
              </CardDescription>
            </div>
            <Button variant='outline' size='sm'>
              Update
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-4 p-4 border rounded-lg'>
            <div className='flex items-center justify-center w-12 h-12 bg-accent rounded'>
              <CreditCard className='h-6 w-6' />
            </div>
            <div className='flex-1'>
              <p className='font-semibold'>
                {paymentMethod.brand} •••• {paymentMethod.last4}
              </p>
              <p className='text-sm text-muted-foreground'>
                Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
              </p>
            </div>
            <Badge variant='outline'>Default</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Your past invoices and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <CreditCard className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-sm text-muted-foreground'>
              No billing history available during trial period
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
