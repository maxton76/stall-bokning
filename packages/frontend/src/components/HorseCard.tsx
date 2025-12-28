import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, MapPin, Link as LinkIcon, Unlink } from 'lucide-react'
import type { Horse } from '@/types/roles'

interface HorseCardProps {
  horse: Horse
  showOwner?: boolean
  showStable?: boolean
  isOwner?: boolean
  onEdit?: (horse: Horse) => void
  onDelete?: (horse: Horse) => void
  onAssign?: (horse: Horse) => void
  onUnassign?: (horse: Horse) => void
}

export function HorseCard({
  horse,
  showOwner = false,
  showStable = true,
  isOwner = false,
  onEdit,
  onDelete,
  onAssign,
  onUnassign
}: HorseCardProps) {
  const canAssign = isOwner && !horse.currentStableId && onAssign
  const canUnassign = isOwner && horse.currentStableId && onUnassign
  const canEdit = isOwner && onEdit
  const canDelete = isOwner && onDelete

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2'>
              {horse.name}
              {horse.status === 'inactive' && (
                <Badge variant='secondary'>Inactive</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {horse.breed && <span>{horse.breed}</span>}
              {horse.age && (
                <>
                  {horse.breed && ' • '}
                  <span>{horse.age} years old</span>
                </>
              )}
            </CardDescription>
          </div>

          {(canEdit || canDelete || canAssign || canUnassign) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(horse)}>
                    <Edit className='mr-2 h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                )}
                {canAssign && (
                  <DropdownMenuItem onClick={() => onAssign(horse)}>
                    <LinkIcon className='mr-2 h-4 w-4' />
                    Assign to Stable
                  </DropdownMenuItem>
                )}
                {canUnassign && (
                  <DropdownMenuItem onClick={() => onUnassign(horse)}>
                    <Unlink className='mr-2 h-4 w-4' />
                    Unassign from Stable
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(horse)}
                      className='text-destructive focus:text-destructive'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        {/* Details Grid */}
        <div className='grid grid-cols-2 gap-2 text-sm'>
          {horse.gender && (
            <div>
              <span className='text-muted-foreground'>Gender:</span>{' '}
              <span className='capitalize'>{horse.gender}</span>
            </div>
          )}
          {horse.color && (
            <div>
              <span className='text-muted-foreground'>Color:</span>{' '}
              <span>{horse.color}</span>
            </div>
          )}
        </div>

        {/* Owner Info */}
        {showOwner && horse.ownerName && (
          <div className='flex items-center gap-2 text-sm border-t pt-3'>
            <span className='text-muted-foreground'>Owner:</span>
            <span className='font-medium'>{horse.ownerName}</span>
            {horse.ownerEmail && (
              <span className='text-muted-foreground text-xs'>
                ({horse.ownerEmail})
              </span>
            )}
          </div>
        )}

        {/* Stable Assignment */}
        {showStable && (
          <div className='border-t pt-3'>
            {horse.currentStableId ? (
              <div className='flex items-center gap-2 text-sm'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
                <span className='text-muted-foreground'>At:</span>
                <span className='font-medium'>{horse.currentStableName || 'Unknown Stable'}</span>
              </div>
            ) : (
              <div className='flex items-center gap-2 text-sm'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
                <span className='text-muted-foreground'>Not assigned to any stable</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {horse.notes && (
          <div className='border-t pt-3'>
            <p className='text-sm text-muted-foreground'>{horse.notes}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className='text-xs text-muted-foreground'>
        {horse.assignedAt && (
          <span>
            Assigned {new Date(horse.assignedAt.toDate()).toLocaleDateString()}
          </span>
        )}
        {!horse.assignedAt && horse.createdAt && (
          <span>
            Added {new Date(horse.createdAt.toDate()).toLocaleDateString()}
          </span>
        )}
      </CardFooter>
    </Card>
  )
}
