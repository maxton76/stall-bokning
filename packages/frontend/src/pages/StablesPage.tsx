import { Plus, Loader2Icon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStables } from '@/hooks/useUserStables'

export default function StablesPage() {
  const { user } = useAuth()
  const { stables, loading } = useUserStables(user?.uid)

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>My Stables</h1>
          <p className='text-muted-foreground mt-1'>
            Manage your stables and view your memberships
          </p>
        </div>
        <Link to='/stables/create'>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            Create Stable
          </Button>
        </Link>
      </div>

      {/* Stables Grid */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {stables.map((stable) => (
          <Link to={`/stables/${stable.id}`} key={stable.id}>
            <Card className='hover:shadow-lg transition-shadow cursor-pointer'>
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div>
                    <CardTitle>{stable.name}</CardTitle>
                    {stable.address && (
                      <CardDescription className='mt-1'>{stable.address}</CardDescription>
                    )}
                  </div>
                  <span className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
                    {stable.ownerId === user?.uid ? 'Owner' : 'Member'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground'>
                  Click to view details and manage this stable
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Empty State if no stables */}
        {stables.length === 0 && (
          <Card className='col-span-full'>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <h3 className='text-lg font-semibold mb-2'>No stables yet</h3>
              <p className='text-muted-foreground mb-4'>
                Create your first stable to get started
              </p>
              <Link to='/stables/create'>
                <Button>
                  <Plus className='mr-2 h-4 w-4' />
                  Create Stable
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
