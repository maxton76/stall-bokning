import { useState } from 'react'

/**
 * Generic dialog state management hook
 * Standardizes dialog open/close behavior and data passing across all components
 *
 * @template T - Type of data associated with the dialog (null if no data needed)
 * @returns Dialog state and control functions
 *
 * @example
 * ```tsx
 * // Before: Multiple state declarations
 * const [formDialogOpen, setFormDialogOpen] = useState(false)
 * const [editingHorse, setEditingHorse] = useState<Horse | null>(null)
 *
 * // After: Single hook call
 * const formDialog = useDialog<Horse>()
 *
 * // Usage:
 * formDialog.openDialog(horse)      // Open with data
 * formDialog.closeDialog()           // Close and clear data
 * formDialog.data                    // Access current data
 * formDialog.open                    // Check if open
 * ```
 */
export function useDialog<T = null>() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)

  /**
   * Open the dialog, optionally with associated data
   * @param dialogData - Optional data to associate with the dialog
   */
  const openDialog = (dialogData?: T) => {
    if (dialogData !== undefined) {
      setData(dialogData)
    }
    setOpen(true)
  }

  /**
   * Close the dialog and clear associated data
   */
  const closeDialog = () => {
    setOpen(false)
    setData(null)
  }

  return {
    open,
    data,
    openDialog,
    closeDialog
  }
}
