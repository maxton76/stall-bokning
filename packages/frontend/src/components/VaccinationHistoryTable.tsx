import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import type { VaccinationRecord } from '@shared/types/vaccination'

interface VaccinationHistoryTableProps {
  records: VaccinationRecord[]
  onEdit: (record: VaccinationRecord) => void
  onDelete: (record: VaccinationRecord) => void
  onAdd: () => void
  loading?: boolean
}

export function VaccinationHistoryTable({
  records,
  onEdit,
  onDelete,
  onAdd,
  loading = false
}: VaccinationHistoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'vaccinationDate', desc: true } // Default sort by date descending (most recent first)
  ])

  const columns: ColumnDef<VaccinationRecord>[] = [
    {
      accessorKey: 'vaccinationDate',
      header: 'Vaccination Date',
      cell: ({ row }) => {
        const date = row.original.vaccinationDate.toDate()
        return format(date, 'MMM d, yyyy')
      },
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.vaccinationDate.toMillis()
        const dateB = rowB.original.vaccinationDate.toMillis()
        return dateA - dateB
      }
    },
    {
      accessorKey: 'vaccinationRuleName',
      header: 'Vaccination Rule',
      cell: ({ row }) => {
        return (
          <span className="font-medium">
            {row.getValue('vaccinationRuleName') as string}
          </span>
        )
      }
    },
    {
      accessorKey: 'nextDueDate',
      header: 'Next Due Date',
      cell: ({ row }) => {
        const date = row.original.nextDueDate.toDate()
        return format(date, 'MMM d, yyyy')
      },
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.nextDueDate.toMillis()
        const dateB = rowB.original.nextDueDate.toMillis()
        return dateA - dateB
      }
    },
    {
      id: 'daysUntilDue',
      header: 'Days Until Due',
      cell: ({ row }) => {
        const nextDueDate = row.original.nextDueDate.toDate()
        const today = new Date()
        const daysUntilDue = differenceInDays(nextDueDate, today)

        // Determine status color
        let variant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default'
        let text = `${Math.abs(daysUntilDue)} days`

        if (daysUntilDue < 0) {
          // Overdue - red
          variant = 'destructive'
          text = `${Math.abs(daysUntilDue)} days overdue`
        } else if (daysUntilDue <= 30) {
          // Expiring soon (within 30 days) - amber/warning
          variant = 'outline'
          text = `${daysUntilDue} days`
        } else {
          // Current - green/default
          variant = 'secondary'
          text = `${daysUntilDue} days`
        }

        return (
          <Badge variant={variant} className="font-normal">
            {text}
          </Badge>
        )
      },
      sortingFn: (rowA, rowB) => {
        const daysA = differenceInDays(rowA.original.nextDueDate.toDate(), new Date())
        const daysB = differenceInDays(rowB.original.nextDueDate.toDate(), new Date())
        return daysA - daysB
      }
    },
    {
      accessorKey: 'veterinarianName',
      header: 'Veterinarian',
      cell: ({ row }) => {
        const vet = row.getValue('veterinarianName') as string | undefined
        return vet ? (
          <span>{vet}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
    },
    {
      accessorKey: 'vaccineProduct',
      header: 'Vaccine Product',
      cell: ({ row }) => {
        const product = row.getValue('vaccineProduct') as string | undefined
        return product ? (
          <span className="text-sm">{product}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const record = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(record)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(record)}
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

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting
    }
  })

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vaccination History</h3>
          <p className="text-sm text-muted-foreground">
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </p>
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Vaccination
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground">
                    Loading vaccination records...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onEdit(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className="py-3 align-middle"
                      onClick={(e) => {
                        // Prevent row click when clicking on actions menu
                        if (cell.column.id === 'actions') {
                          e.stopPropagation()
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground">
                    <p className="text-lg mb-2">No vaccination records found</p>
                    <p className="text-sm">
                      Click "Add Vaccination" to create the first record
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
