import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, MapPin, Trash2 } from 'lucide-react'
import { HorseStatusBadge } from './HorseStatusBadge'
import type { Horse } from '@/types/roles'

interface HorseTableColumnsProps {
  onEdit: (horse: Horse) => void
  onAssign: (horse: Horse) => void
  onUnassign: (horse: Horse) => void
  onDelete: (horse: Horse) => void
}

export function createHorseTableColumns({
  onEdit,
  onAssign,
  onUnassign,
  onDelete
}: HorseTableColumnsProps): ColumnDef<Horse>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <HorseStatusBadge horse={row.original} />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      )
    },
    {
      accessorKey: 'gender',
      header: 'Gender',
      cell: ({ row }) => {
        const gender = row.getValue('gender') as string | undefined
        return gender ? (
          <span className="capitalize">{gender}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
    },
    {
      accessorKey: 'age',
      header: 'Age',
      cell: ({ row }) => {
        const horse = row.original
        let age: number | undefined

        // Try to use age field first
        if (horse.age !== undefined) {
          age = horse.age
        } else if (horse.dateOfBirth) {
          // Calculate age from dateOfBirth
          const birthDate = horse.dateOfBirth.toDate()
          const today = new Date()
          age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
        }

        return age !== undefined ? (
          <span>{age} years</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
    },
    {
      accessorKey: 'currentStableName',
      header: 'Stable',
      cell: ({ row }) => {
        const stableName = row.getValue('currentStableName') as string | undefined
        return stableName ? (
          <span>{stableName}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )
      }
    },
    {
      id: 'identification',
      header: 'Identification',
      cell: ({ row }) => {
        const horse = row.original
        const id = horse.ueln || horse.chipNumber

        return id ? (
          <span className="font-mono text-sm">{id}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
    },
    {
      accessorKey: 'ownerName',
      header: 'Owner',
      cell: ({ row }) => {
        const ownerName = row.getValue('ownerName') as string | undefined
        return ownerName ? (
          <span>{ownerName}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const horse = row.original
        const isAssigned = !!horse.currentStableId

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(horse)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isAssigned ? (
                <DropdownMenuItem onClick={() => onUnassign(horse)}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Unassign from Stable
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onAssign(horse)}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Assign to Stable
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(horse)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]
}
