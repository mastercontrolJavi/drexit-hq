'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, FileSpreadsheet, Check, X } from 'lucide-react'

type ColumnMapping = 'date' | 'description' | 'amount' | 'skip'

const DATE_HINTS = ['date', 'trans date', 'transaction date', 'posting date', 'booked', 'value date']
const DESC_HINTS = ['description', 'details', 'narrative', 'transaction', 'reference', 'memo', 'payee', 'name', 'merchant']
const AMOUNT_HINTS = ['amount', 'debit', 'value', 'money out', 'withdrawal', 'payment', 'sum', 'total']

function guessMapping(header: string): ColumnMapping {
  const h = header.toLowerCase().trim()
  if (DATE_HINTS.some((hint) => h.includes(hint))) return 'date'
  if (DESC_HINTS.some((hint) => h.includes(hint))) return 'description'
  if (AMOUNT_HINTS.some((hint) => h.includes(hint))) return 'amount'
  return 'skip'
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === 'number') return Math.abs(raw)
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/[£$€,\s]/g, '').replace(/[()]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.abs(num)
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    return null
  }
  const str = String(raw).trim()
  // Try common date formats
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})/, // yyyy-MM-dd
    /^(\d{2})\/(\d{2})\/(\d{4})/, // dd/MM/yyyy or MM/dd/yyyy
    /^(\d{2})-(\d{2})-(\d{4})/, // dd-MM-yyyy
  ]
  for (const p of patterns) {
    const m = str.match(p)
    if (m) {
      // For dd/MM/yyyy format
      if (p === patterns[1] || p === patterns[2]) {
        const day = parseInt(m[1])
        const month = parseInt(m[2])
        const year = parseInt(m[3])
        // If first number > 12, it's definitely the day
        if (day > 12) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        // Default to dd/MM/yyyy (UK format)
        return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`
      }
      return `${m[1]}-${m[2]}-${m[3]}`
    }
  }
  // Fallback: try Date.parse
  const d = new Date(str)
  if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd')
  return null
}

interface CsvImportProps {
  onImportComplete: () => void
}

export function CsvImport({ onImportComplete }: CsvImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<unknown[][]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      if (!data) return

      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

      if (jsonData.length < 2) {
        toast.error('File has no data rows')
        return
      }

      const fileHeaders = (jsonData[0] as string[]).map((h) => String(h || '').trim())
      const fileRows = jsonData.slice(1).filter((row) => row.some((cell) => cell != null && cell !== ''))

      setHeaders(fileHeaders)
      setRows(fileRows)
      setMappings(fileHeaders.map(guessMapping))
      setOpen(true)
    }
    reader.readAsArrayBuffer(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function updateMapping(index: number, value: string) {
    const newMappings = [...mappings]
    newMappings[index] = value as ColumnMapping
    setMappings(newMappings)
  }

  const dateCol = mappings.indexOf('date')
  const descCol = mappings.indexOf('description')
  const amountCol = mappings.indexOf('amount')
  const isValid = dateCol !== -1 && amountCol !== -1

  async function handleImport() {
    if (!isValid) {
      toast.error('Map at least Date and Amount columns')
      return
    }

    setImporting(true)
    const entries = []
    let skipped = 0

    for (const row of rows) {
      const date = parseDate(row[dateCol])
      const amount = parseAmount(row[amountCol])

      if (!date || amount === null || amount === 0) {
        skipped++
        continue
      }

      const description = descCol !== -1 ? String(row[descCol] || '').trim() : null
      const monthKey = date.substring(0, 7) // yyyy-MM

      entries.push({
        date,
        category: 'Other',
        description: description || null,
        amount_gbp: amount,
        month_key: monthKey,
      })
    }

    if (entries.length === 0) {
      toast.error('No valid entries found to import')
      setImporting(false)
      return
    }

    // Batch insert (Supabase supports up to 1000 at a time)
    const batchSize = 500
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const { error } = await supabase.from('budget_entries').insert(batch)
      if (error) {
        toast.error(`Import failed at batch ${Math.floor(i / batchSize) + 1}`)
        setImporting(false)
        return
      }
    }

    toast.success(`Imported ${entries.length} entries${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
    setImporting(false)
    setOpen(false)
    onImportComplete()
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="active:scale-[0.98] transition-all duration-200"
      >
        <Upload className="mr-1.5 h-4 w-4" />
        Import CSV/XLSX
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Import Expenses</SheetTitle>
            <SheetDescription>
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName} — {rows.length} rows found
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Column Mapping */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Map Columns
              </p>
              <div className="flex flex-wrap gap-3">
                {headers.map((header, i) => (
                  <div key={i} className="space-y-1">
                    <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                      {header}
                    </span>
                    <Select
                      value={mappings[i]}
                      onValueChange={(v) => updateMapping(i, v ?? 'skip')}
                    >
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="skip">Skip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation */}
            <div className="flex gap-2">
              <Badge className={cn('text-xs', dateCol !== -1 ? 'bg-ios-green/10 text-ios-green' : 'bg-ios-red/10 text-ios-red')}>
                {dateCol !== -1 ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
                Date
              </Badge>
              <Badge className={cn('text-xs', descCol !== -1 ? 'bg-ios-green/10 text-ios-green' : 'bg-ios-gray-6 text-muted-foreground')}>
                {descCol !== -1 ? <Check className="mr-1 h-3 w-3" /> : null}
                Description {descCol === -1 && '(optional)'}
              </Badge>
              <Badge className={cn('text-xs', amountCol !== -1 ? 'bg-ios-green/10 text-ios-green' : 'bg-ios-red/10 text-ios-red')}>
                {amountCol !== -1 ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
                Amount
              </Badge>
            </div>

            {/* Preview */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Preview (first 5 rows)
              </p>
              <ScrollArea className="h-[240px]">
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-ios-gray-6">
                        {headers.map((h, i) => (
                          <th
                            key={i}
                            className={cn(
                              'px-3 py-2 text-left font-medium',
                              mappings[i] === 'skip' && 'opacity-40'
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-t border-ios-gray-6">
                          {headers.map((_, ci) => (
                            <td
                              key={ci}
                              className={cn(
                                'px-3 py-2',
                                mappings[ci] === 'skip' && 'opacity-40'
                              )}
                            >
                              {row[ci] != null ? String(row[ci]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>

            <p className="text-xs text-muted-foreground">
              All imported entries will be categorized as &quot;Other&quot;. You can change categories in the expense table after import.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={!isValid || importing}
                className="flex-1 bg-ios-blue text-white hover:bg-ios-blue/90 active:scale-[0.98] transition-all duration-200"
              >
                {importing ? 'Importing...' : `Import ${rows.length} Entries`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="active:scale-[0.98] transition-all duration-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
