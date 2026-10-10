export interface HealthResponse {
  status: 'ok' | 'error'
  app: string
  version: string
  database?: {
    status: string
    journal_mode: string
    foreign_keys_enabled: boolean
  }
  error?: string
  detail?: string
}

export interface AppInfoResponse {
  app: string
  developer: string
  version: string
  status: string
  docs: string
}

export interface Customer {
  id: number
  name: string
  company_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  tax_id?: string | null
  balance_cents: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  code: string
  name: string
  category?: string | null
  cost_price_cents: number
  sale_price_cents: number
  current_stock: number
  min_stock_level: number
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  unit_price_cents: number
  quantity: number
  line_total_cents: number
}

export interface Sale {
  id: number
  sale_number: string
  customer_id?: number | null
  customer_name?: string | null
  total_cents: number
  paid_amount_cents: number
  remaining_amount_cents: number
  payment_status: string
  payment_method: string
  status: string
  notes?: string | null
  sale_date: string
  created_at: string
  items: SaleItem[]
}

export interface Expense {
  id: number
  category: string
  amount_cents: number
  payment_method: string
  description?: string | null
  expense_date: string
  created_at: string
}

export interface Collection {
  id: number
  customer_id: number
  customer_name?: string | null
  sale_id?: number | null
  amount_cents: number
  payment_method: string
  notes?: string | null
  collection_date: string
  created_at: string
}

export interface CustomerTransaction {
  id: number
  customer_id: number
  transaction_type: string
  amount_cents: number
  balance_after_cents: number
  reference_id?: number | null
  description?: string | null
  transaction_date: string
  created_at: string
}

export interface Setting {
  id: number
  business_name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  currency_code: string
  currency_symbol: string
  tax_id?: string | null
  note_footer?: string | null
  updated_at: string
}
