import { Shield, Check, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OrganizationPermissionsPage() {

  // Permission matrix: role -> permissions
  const permissions = [
    { action: 'Manage organization settings', admin: true, manager: false, member: false },
    { action: 'Manage members', admin: true, manager: true, member: false },
    { action: 'View all stables', admin: true, manager: true, member: true },
    { action: 'Create stables', admin: true, manager: true, member: false },
    { action: 'Edit stable settings', admin: true, manager: true, member: false },
    { action: 'Manage horses', admin: true, manager: true, member: true },
    { action: 'View schedules', admin: true, manager: true, member: true },
    { action: 'Create schedules', admin: true, manager: true, member: false },
    { action: 'Book shifts', admin: true, manager: true, member: true },
    { action: 'Manage manure records', admin: true, manager: true, member: false },
    { action: 'View integrations', admin: true, manager: true, member: false },
    { action: 'Configure integrations', admin: true, manager: false, member: false },
    { action: 'View subscription', admin: true, manager: false, member: false },
    { action: 'Manage billing', admin: true, manager: false, member: false },
  ]

  const roleDefinitions = [
    {
      role: 'Administrator',
      key: 'admin' as const,
      description: 'Full access to all organization features and settings',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    },
    {
      role: 'Manager',
      key: 'manager' as const,
      description: 'Can manage stables, horses, and schedules',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    },
    {
      role: 'Member',
      key: 'member' as const,
      description: 'Basic access to view and participate in stable activities',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  ]

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Permissions</h1>
        <p className='text-muted-foreground mt-1'>
          Role-based access control for organization members
        </p>
      </div>

      {/* Role Definitions */}
      <div className='grid gap-4 md:grid-cols-3'>
        {roleDefinitions.map((def) => (
          <Card key={def.key}>
            <CardHeader>
              <div className='flex items-center gap-2 mb-2'>
                <Shield className='h-5 w-5' />
                <CardTitle className='text-lg'>{def.role}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>{def.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Detailed breakdown of what each role can do
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left p-4 font-semibold'>Action</th>
                  {roleDefinitions.map((def) => (
                    <th key={def.key} className='text-center p-4'>
                      <Badge className={def.color}>{def.role}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm, index) => (
                  <tr key={index} className='border-b hover:bg-accent transition-colors'>
                    <td className='p-4'>{perm.action}</td>
                    <td className='text-center p-4'>
                      {perm.admin ? (
                        <Check className='mx-auto h-5 w-5 text-green-600' />
                      ) : (
                        <X className='mx-auto h-5 w-5 text-red-600' />
                      )}
                    </td>
                    <td className='text-center p-4'>
                      {perm.manager ? (
                        <Check className='mx-auto h-5 w-5 text-green-600' />
                      ) : (
                        <X className='mx-auto h-5 w-5 text-red-600' />
                      )}
                    </td>
                    <td className='text-center p-4'>
                      {perm.member ? (
                        <Check className='mx-auto h-5 w-5 text-green-600' />
                      ) : (
                        <X className='mx-auto h-5 w-5 text-red-600' />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Roles Note */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Roles & Advanced Permissions</CardTitle>
          <CardDescription>
            Available in Professional and Enterprise plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground mb-4'>
            Create custom roles with granular permissions tailored to your organization's needs.
            Control access to specific stables, features, and data on a per-role basis.
          </p>
          <p className='text-sm text-muted-foreground'>
            <strong>Specialized roles available:</strong> Veterinarian, Dentist, Farrier, Groom,
            Horse Owner, Rider, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
