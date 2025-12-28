import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { exportHorses } from '@/lib/exportUtils'
import type { Horse } from '@/types/roles'

interface HorseExportButtonProps {
  horses: Horse[]
  disabled?: boolean
}

export function HorseExportButton({ horses, disabled }: HorseExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setIsExporting(true)

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100))

      exportHorses(horses, format)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const horseCount = horses.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting || horseCount === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2">
          <FileText className="h-4 w-4" />
          Export as CSV ({horseCount} {horseCount === 1 ? 'horse' : 'horses'})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export as Excel ({horseCount} {horseCount === 1 ? 'horse' : 'horses'})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
