'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Upload, X } from 'lucide-react'

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
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    return null
  }
  const str = String(raw).trim()
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})/,
    /^(\d{2})\/(\d{2})\/(\d{4})/,
    /^(\d{2})-(\d{2})-(\d{4})/,
  ]
  for (const p of patterns) {
    const m = str.match(p)
    if (m) {
      if (p === patterns[1] || p === patterns[2]) {
        const day = parseInt(m[1])
        const month = parseInt(m[2])
        const year = parseInt(m[3])
        if (day > 12) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`
      }
      return `${m[1]}-${m[2]}-${m[3]}`
    }
  }
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
      const monthKey = date.substring(0, 7)
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

    toast.success(`Imported ${entries.length}${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
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
      <button
        onClick={() => fileRef.current?.click()}
        className="caption flex items-center gap-2 border border-border px-3 py-2 text-text-2 transition-colors duration-200 ease-out-200 hover:border-text-1 hover:text-text-1"
      >
        <Upload className="h-3 w-3" strokeWidth={1.5} />
        &gt; IMPORT FILE...
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="!w-[640px] !max-w-[640px] !rounded-none !border-l !border-border-strong !bg-bg-elevated !p-0"
        >
          <SheetHeader className="border-b border-border px-5 py-3">
            <SheetTitle className="caption !font-mono text-text-2 !text-[11px] !uppercase !tracking-[0.08em]">
              IMPORT_EXPENSES
            </SheetTitle>
            <SheetDescription className="font-mono text-[12px] text-text-3">
              &gt; {fileName} · {rows.length} rows detected
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-5">
            {/* Column mapping */}
            <div>
              <p className="caption text-text-2 mb-2">MAP_COLUMNS</p>
              <div className="flex flex-wrap gap-3">
                {headers.map((header, i) => (
                  <div key={i} className="space-y-1">
                    <span className="caption block max-w-[140px] truncate text-text-3">
                      {header}
                    </span>
                    <Select value={mappings[i]} onValueChange={(v) => updateMapping(i, v ?? 'skip')}>
                      <SelectTrigger className="h-7 w-[120px] rounded-none border-border bg-transparent font-mono text-[11px] uppercase">
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

            {/* Validation chips */}
            <div className="flex gap-2 caption">
              <span
                className={cn(
                  'flex items-center gap-1 border px-2 py-1',
                  dateCol !== -1
                    ? 'border-success text-success'
                    : 'border-danger text-danger',
                )}
              >
                {dateCol !== -1 ? <Check className="h-3 w-3" strokeWidth={1.5} /> : <X className="h-3 w-3" strokeWidth={1.5} />}
                DATE
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 border px-2 py-1',
                  descCol !== -1
                    ? 'border-success text-success'
                    : 'border-border text-text-3',
                )}
              >
                {descCol !== -1 && <Check className="h-3 w-3" strokeWidth={1.5} />}
                DESC{descCol === -1 && ' · OPTIONAL'}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 border px-2 py-1',
                  amountCol !== -1
                    ? 'border-success text-success'
                    : 'border-danger text-danger',
                )}
              >
                {amountCol !== -1 ? <Check className="h-3 w-3" strokeWidth={1.5} /> : <X className="h-3 w-3" strokeWidth={1.5} />}
                AMOUNT
              </span>
            </div>

            {/* Preview */}
            <div>
              <p className="caption text-text-2 mb-2">PREVIEW · FIRST 5 ROWS</p>
              <ScrollArea className="h-[220px] border border-border">
                <table className="w-full font-mono text-[11px] tabular-nums">
                  <thead>
                    <tr className="border-b border-border bg-bg-base">
                      {headers.map((h, i) => (
                        <th
                          key={i}
                          className={cn(
                            'px-3 py-1.5 text-left caption text-text-2',
                            mappings[i] === 'skip' && 'opacity-40',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-b border-border last:border-b-0">
                        {headers.map((_, ci) => (
                          <td
                            key={ci}
                            className={cn(
                              'px-3 py-1.5 text-text-1',
                              mappings[ci] === 'skip' && 'opacity-40',
                            )}
                          >
                            {row[ci] != null ? String(row[ci]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            <p className="font-mono text-[11px] text-text-3">
              &gt; imported entries default to category &quot;Other&quot; — re-categorize after import
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={!isValid || importing}
                className="caption flex-1 border border-text-1 bg-text-1 px-3 py-2 text-bg-base transition-colors disabled:opacity-50 hover:bg-bg-base hover:text-text-1 disabled:hover:bg-text-1 disabled:hover:text-bg-base"
              >
                {importing ? 'IMPORTING...' : `IMPORT ${rows.length} ROWS`}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="caption border border-border px-3 py-2 text-text-2 hover:border-text-1 hover:text-text-1"
              >
                CANCEL
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
