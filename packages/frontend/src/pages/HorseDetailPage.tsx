import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDialog } from '@/hooks/useDialog'
import { getHorse, updateHorse } from '@/services/horseService'
import { getOrganizationHorseGroups } from '@/services/horseGroupService'
import { HorseFormDialog } from '@/components/HorseFormDialog'
import { BasicInfoCard } from '@/components/horse-detail/BasicInfoCard'
import { LocationCard } from '@/components/horse-detail/LocationCard'
import { OwnershipCard } from '@/components/horse-detail/OwnershipCard'
import { CareCard } from '@/components/horse-detail/CareCard'
import { VaccinationCard } from '@/components/horse-detail/VaccinationCard'
import { ActivitiesCard } from '@/components/horse-detail/ActivitiesCard'
import { TeamCard } from '@/components/horse-detail/TeamCard'
import type { Horse, HorseGroup } from '@/types/roles'

export default function HorseDetailPage() {
  const { horseId } = useParams<{ horseId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data fetching
  const horse = useAsyncData<Horse>({
    loadFn: () => getHorse(horseId!),
    errorMessage: 'Failed to load horse details'
  })

  // Horse groups for the form
  const horseGroups = useAsyncData<HorseGroup[]>({
    loadFn: async () => {
      if (!horse.data?.currentStableId) return []
      return getOrganizationHorseGroups(horse.data.currentStableId)
    },
    errorMessage: 'Failed to load horse groups'
  })

  // Dialog state for edit
  const formDialog = useDialog<Horse>()

  // Load data on mount
  useEffect(() => {
    if (user && horseId) {
      horse.load()
    }
  }, [user, horseId])

  // Load horse groups when horse data is available
  useEffect(() => {
    if (horse.data?.currentStableId) {
      horseGroups.load()
    }
  }, [horse.data?.currentStableId])

  // Handle edit
  const handleEdit = () => {
    if (horse.data) {
      formDialog.openDialog(horse.data)
    }
  }

  // Handle save after edit
  const handleSave = async (horseData: Omit<Horse, 'id' | 'ownerId' | 'ownerName' | 'ownerEmail' | 'createdAt' | 'updatedAt' | 'lastModifiedBy'>) => {
    if (!user || !horse.data) return

    await updateHorse(horse.data.id, user.uid, horseData)
    formDialog.closeDialog()
    await horse.reload()
  }

  if (horse.loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (horse.error || !horse.data) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-destructive mb-2'>Horse not found</h2>
          <p className='text-muted-foreground mb-4'>
            The horse you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/horses')}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to My Horses
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6'>
      {/* Header */}
      <div className='space-y-4'>
        {/* Breadcrumb */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to='/dashboard'>Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to='/horses'>My Horses</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{horse.data.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title and Actions */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>{horse.data.name}</h1>
            {horse.data.breed && (
              <p className='text-sm sm:text-base text-muted-foreground mt-1'>{horse.data.breed}</p>
            )}
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => navigate('/horses')} size="sm">
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className='grid gap-6 md:grid-cols-2'>
        <BasicInfoCard horse={horse.data} onEdit={handleEdit} />
        <LocationCard horse={horse.data} onUpdate={horse.reload} />
      </div>

      <div className='grid gap-6'>
        <OwnershipCard horse={horse.data} />
        <CareCard horse={horse.data} />
        <VaccinationCard horse={horse.data} />
        <ActivitiesCard horse={horse.data} />
        <TeamCard horse={horse.data} />
      </div>

      {/* Edit Dialog */}
      {horse.data && (
        <HorseFormDialog
          open={formDialog.open}
          onOpenChange={(open) => !open && formDialog.closeDialog()}
          horse={formDialog.data}
          onSave={handleSave}
          allowStableAssignment={true}
          availableStables={[]}
          availableGroups={horseGroups.data || []}
        />
      )}
    </div>
  )
}
