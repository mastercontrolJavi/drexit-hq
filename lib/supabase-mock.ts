import { toast } from 'sonner'
import * as fixtures from './fixtures'

type Row = Record<string, unknown>

const TABLE_DATA: Record<string, Row[]> = {
  todos:                fixtures.todos                as Row[],
  non_negotiables:      fixtures.nonNegotiables       as Row[],
  budget_entries:       fixtures.budgetEntries        as Row[],
  savings_goals:        fixtures.savingsGoals         as Row[],
  savings_transactions: fixtures.savingsTransactions  as Row[],
  goals:                fixtures.goals                as Row[],
  weigh_ins:            fixtures.weighIns             as Row[],
  food_items:           fixtures.foodItems            as Row[],
  business_ideas:       fixtures.businessIdeas        as Row[],
  app_settings:         fixtures.appSettings          as Row[],
}

function getRows(table: string): Row[] {
  return TABLE_DATA[table] ?? []
}

class MockQueryBuilder {
  private _table:    string
  private _single  = false
  private _head    = false
  private _isWrite = false
  private _eq:  Array<[string, unknown]>   = []
  private _in:  Array<[string, unknown[]]> = []
  private _gte: Array<[string, unknown]>   = []
  private _lte: Array<[string, unknown]>   = []
  private _order?: { col: string; asc: boolean }
  private _limit?: number

  constructor(table: string) {
    this._table = table
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.head) this._head = true
    return this
  }
  eq(col: string, val: unknown)         { this._eq.push([col, val]);  return this }
  neq(_col: string, _val: unknown)       { return this }
  gte(col: string, val: unknown)         { this._gte.push([col, val]); return this }
  lte(col: string, val: unknown)         { this._lte.push([col, val]); return this }
  in(col: string, vals: unknown[])       { this._in.push([col, vals]); return this }
  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, asc: opts?.ascending ?? true }
    return this
  }
  limit(n: number) { this._limit = n; return this }
  single()         { this._single = true; return this }

  insert(_payload: unknown) { this._isWrite = true; return this }
  update(_payload: unknown) { this._isWrite = true; return this }
  upsert(_payload: unknown, _opts?: unknown) { this._isWrite = true; return this }
  delete()                  { this._isWrite = true; return this }

  then(
    resolve: (v: { data: unknown; error: null; count?: number }) => void,
    _reject?: (e: unknown) => void,
  ) {
    if (this._isWrite) {
      toast('Demo mode — writes disabled')
      resolve({ data: null, error: null })
      return
    }

    let rows = [...getRows(this._table)]

    for (const [col, val] of this._eq)  rows = rows.filter(r => r[col] === val)
    for (const [col, vals] of this._in) rows = rows.filter(r => vals.includes(r[col]))
    for (const [col, val] of this._gte) rows = rows.filter(r => String(r[col]) >= String(val))
    for (const [col, val] of this._lte) rows = rows.filter(r => String(r[col]) <= String(val))

    if (this._order) {
      const { col, asc } = this._order
      rows.sort((a, b) => {
        const av = String(a[col] ?? '')
        const bv = String(b[col] ?? '')
        return asc ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }

    if (this._head) { resolve({ data: null, error: null, count: rows.length }); return }
    if (this._limit != null) rows = rows.slice(0, this._limit)
    if (this._single) { resolve({ data: rows[0] ?? null, error: null }); return }

    resolve({ data: rows, error: null })
  }
}

export function createMockClient() {
  return {
    from(table: string) {
      return new MockQueryBuilder(table)
    },
  }
}
