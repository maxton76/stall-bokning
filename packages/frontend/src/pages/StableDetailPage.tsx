import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Settings, Users, Calendar, BarChart3, Pencil, Trash2, Plus, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShiftTypeDialog } from '@/components/ShiftTypeDialog'
import { getShiftTypesByStable, createShiftType, updateShiftType, deleteShiftType } from '@/services/shiftTypeService'
import type { ShiftType } from '@/types/schedule'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Stable {
  id: string
  name: string
  description?: string
  address?: string
  ownerId: string
  ownerEmail?: string
}

export default function StableDetailPage() {
  const { stableId } = useParams()

  const [stable, setStable] = useState<Stable | null>(null)
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null)

  useEffect(() => {
    if (stableId) {
      loadStableData()
      loadShiftTypes()
    }
  }, [stableId])

  const loadStableData = async () => {
    if (!stableId) return

    try {
      const stableDoc = await getDoc(doc(db, 'stables', stableId))
      if (stableDoc.exists()) {
        setStable({
          id: stableDoc.id,
          ...stableDoc.data()
        } as Stable)
      }
    } catch (error) {
      console.error('Error loading stable:', error)
    }
  }

  const loadShiftTypes = async () => {
    if (!stableId) return

    try {
      setLoading(true)
      const types = await getShiftTypesByStable(stableId)
      setShiftTypes(types)
    } catch (error) {
      console.error('Error loading shift types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShiftType = async (data: Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'updatedAt'>) => {
    if (!stableId) return

    try {
      await createShiftType(stableId, data)
      await loadShiftTypes()
    } catch (error) {
      console.error('Error creating shift type:', error)
      throw error // Re-throw so dialog can show error message
    }
  }

  const handleUpdateShiftType = async (data: Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'updatedAt'>) => {
    if (!editingShiftType) return

    try {
      await updateShiftType(editingShiftType.id, data)
      await loadShiftTypes()
      setEditingShiftType(null)
    } catch (error) {
      console.error('Error updating shift type:', error)
      throw error // Re-throw so dialog can show error message
    }
  }

  const handleDeleteShiftType = async (shiftTypeId: string) => {
    if (!confirm('Are you sure you want to delete this shift type?')) return

    try {
      await deleteShiftType(shiftTypeId)
      await loadShiftTypes()
    } catch (error) {
      console.error('Error deleting shift type:', error)
      alert('Failed to delete shift type. Please try again.')
    }
  }

  const openCreateDialog = () => {
    setEditingShiftType(null)
    setDialogOpen(true)
  }

  const openEditDialog = (shiftType: ShiftType) => {
    setEditingShiftType(shiftType)
    setDialogOpen(true)
  }

  if (!stable) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <Link to='/stables'>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Stables
          </Button>
        </Link>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>{stable.name}</h1>
            {stable.description && (
              <p className='text-muted-foreground mt-1'>{stable.description}</p>
            )}
            {stable.address && (
              <p className='text-sm text-muted-foreground mt-1'>{stable.address}</p>
            )}
          </div>
          <div className='flex gap-2'>
            <Link to={`/stables/${stableId}/schedule`}>
              <Button variant='outline'>
                <Calendar className='mr-2 h-4 w-4' />
                View Schedule
              </Button>
            </Link>
            <Link to={`/stables/${stableId}/settings`}>
              <Button variant='outline'>
                <Settings className='mr-2 h-4 w-4' />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Shift Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{shiftTypes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm font-medium'>{stable.ownerEmail || 'Unknown'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm font-medium text-green-600'>Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue='members' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='members'>
            <Users className='mr-2 h-4 w-4' />
            Members
          </TabsTrigger>
          <TabsTrigger value='shifts'>
            <Calendar className='mr-2 h-4 w-4' />
            Shift Types
          </TabsTrigger>
          <TabsTrigger value='stats'>
            <BarChart3 className='mr-2 h-4 w-4' />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value='members' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-semibold'>Members</h2>
            <Link to={`/stables/${stableId}/invite`}>
              <Button>
                <Plus className='mr-2 h-4 w-4' />
                Invite Member
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className='p-12'>
              <div className='text-center space-y-3'>
                <Users className='h-12 w-12 mx-auto text-muted-foreground opacity-50' />
                <h3 className='text-lg font-semibold'>Member Management Coming Soon</h3>
                <p className='text-muted-foreground max-w-md mx-auto'>
                  Member management features are currently being developed.
                  For now, you can invite members using the button above.
                </p>
                <Link to={`/stables/${stableId}/invite`}>
                  <Button variant='outline' className='mt-4'>
                    <Plus className='mr-2 h-4 w-4' />
                    Go to Invites
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shift Types Tab */}
        <TabsContent value='shifts' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-semibold'>Shift Types</h2>
            <Button onClick={openCreateDialog}>
              <Plus className='mr-2 h-4 w-4' />
              Create Shift Type
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className='p-6'>
                <p className='text-muted-foreground text-center'>Loading shift types...</p>
              </CardContent>
            </Card>
          ) : shiftTypes.length === 0 ? (
            <Card>
              <CardContent className='p-6'>
                <div className='text-center space-y-2'>
                  <p className='text-muted-foreground'>No shift types yet</p>
                  <Button variant='outline' onClick={openCreateDialog}>
                    <Plus className='mr-2 h-4 w-4' />
                    Create Your First Shift Type
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              {shiftTypes.map((shiftType) => (
                <Card key={shiftType.id}>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div>
                        <CardTitle>{shiftType.name}</CardTitle>
                        <CardDescription>{shiftType.time}</CardDescription>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => openEditDialog(shiftType)}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleDeleteShiftType(shiftType.id)}
                        >
                          <Trash2 className='h-4 w-4 text-destructive' />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Points</span>
                        <span className='font-medium'>{shiftType.points}</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Days</span>
                        <span className='font-medium'>{shiftType.daysOfWeek.join(', ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value='stats' className='space-y-4'>
          <h2 className='text-2xl font-semibold'>Statistics</h2>
          <Card>
            <CardContent className='p-6'>
              <p className='text-muted-foreground text-center py-12'>
                Statistics dashboard coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shift Type Dialog */}
      <ShiftTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={editingShiftType ? handleUpdateShiftType : handleCreateShiftType}
        shiftType={editingShiftType}
        title={editingShiftType ? 'Edit Shift Type' : 'Create Shift Type'}
      />
    </div>
  )
}
