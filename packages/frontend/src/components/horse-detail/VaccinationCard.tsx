import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Syringe, Loader2Icon } from 'lucide-react'
import { format } from 'date-fns'
import { useDialog } from '@/hooks/useDialog'
import { VaccinationHistoryTable } from '@/components/VaccinationHistoryTable'
import { VaccinationRecordDialog } from '@/components/VaccinationRecordDialog'
import {
  getHorseVaccinationRecords,
  deleteVaccinationRecord
} from '@/services/vaccinationService'
import type { Horse } from '@/types/roles'
import type { VaccinationRecord } from '@shared/types/vaccination'

interface VaccinationCardProps {
  horse: Horse
}

export function VaccinationCard({ horse }: VaccinationCardProps) {
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const recordDialog = useDialog<VaccinationRecord>()
  const deleteDialog = useDialog<VaccinationRecord>()

  // Load vaccination records
  const loadRecords = async () => {
    try {
      setLoading(true)
      const data = await getHorseVaccinationRecords(horse.id)
      setRecords(data)
    } catch (error) {
      console.error('Failed to load vaccination records:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (horse.id) {
      loadRecords()
    }
  }, [horse.id])

  // Handlers
  const handleAdd = () => {
    recordDialog.openDialog(null)
  }

  const handleEdit = (record: VaccinationRecord) => {
    recordDialog.openDialog(record)
  }

  const handleDelete = (record: VaccinationRecord) => {
    deleteDialog.openDialog(record)
  }

  const confirmDelete = async () => {
    if (!deleteDialog.data) return

    try {
      await deleteVaccinationRecord(deleteDialog.data.id)
      deleteDialog.closeDialog()
      await loadRecords() // Reload records
    } catch (error) {
      console.error('Failed to delete vaccination record:', error)
    }
  }

  const handleSuccess = async () => {
    recordDialog.closeDialog()
    await loadRecords() // Reload records
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Vaccination</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 overflow-hidden">
          {/* Vaccination Status Section */}
          {horse.vaccinationRuleId && horse.vaccinationRuleName ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Current Vaccination Rule</h3>
                  <p className="font-medium mt-1">{horse.vaccinationRuleName}</p>
                </div>
                {horse.vaccinationStatus && (
                  <Badge
                    variant={
                      horse.vaccinationStatus === 'current'
                        ? 'default'
                        : horse.vaccinationStatus === 'expiring_soon'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {horse.vaccinationStatus === 'current' && 'Up to date'}
                    {horse.vaccinationStatus === 'expiring_soon' && 'Due soon'}
                    {horse.vaccinationStatus === 'expired' && 'Overdue'}
                    {horse.vaccinationStatus === 'no_records' && 'No records'}
                  </Badge>
                )}
              </div>

              {/* Next Due Date */}
              {horse.nextVaccinationDue && (
                <div className="flex items-baseline gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Next due:</span>
                  <span
                    className={`font-medium ${
                      horse.vaccinationStatus === 'expired'
                        ? 'text-destructive'
                        : horse.vaccinationStatus === 'expiring_soon'
                        ? 'text-amber-600'
                        : ''
                    }`}
                  >
                    {format(horse.nextVaccinationDue.toDate(), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              {/* Last Vaccination Date */}
              {horse.lastVaccinationDate && (
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">Last vaccination:</span>
                  <span className="text-sm">
                    {format(horse.lastVaccinationDate.toDate(), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No vaccination rule assigned to this horse
              </p>
            </div>
          )}

          {/* Vaccination History Table */}
          <div className="border-t pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <VaccinationHistoryTable
                records={records}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <VaccinationRecordDialog
        open={recordDialog.open}
        onOpenChange={(open) => !open && recordDialog.closeDialog()}
        horse={horse}
        organizationId={horse.currentStableId || ''}
        record={recordDialog.data}
        onSuccess={handleSuccess}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && deleteDialog.closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vaccination Record</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.data && (
                <>
                  Are you sure you want to delete the vaccination record from{' '}
                  {format(deleteDialog.data.vaccinationDate.toDate(), 'MMM d, yyyy')}?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
