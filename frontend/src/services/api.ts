import {
  HealthResponse,
  AppInfoResponse,
  Customer,
  Product,
  Sale,
  Expense,
  Collection,
  CustomerTransaction,
  Setting,
} from '../types/api'

// Vite dev server proxy yönlendirmesi veya doğrudan backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const API_V1_URL = `${API_BASE_URL}/v1`

// ==================== SYSTEM ====================

export async function checkBackendHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bağlantı hatası'
    return {
      status: 'error',
      app: 'Gozel Esnaf',
      version: '0.1.0',
      error: 'Backend servisine erişilemedi',
      detail: message,
    }
  }
}

export async function getRootInfo(): Promise<AppInfoResponse | null> {
  try {
    const response = await fetch('/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// ==================== CUSTOMERS ====================

export async function getCustomers(search?: string, isActive = true): Promise<Customer[]> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (isActive !== undefined) params.append('is_active', String(isActive))

  const res = await fetch(`${API_V1_URL}/customers?${params.toString()}`)
  if (!res.ok) throw new Error('Müşteriler alınamadı')
  return res.json()
}

export async function getCustomer(id: number): Promise<Customer> {
  const res = await fetch(`${API_V1_URL}/customers/${id}`)
  if (!res.ok) throw new Error('Müşteri bulunamadı')
  return res.json()
}

export async function createCustomer(data: Partial<Customer> & { initial_balance_cents?: number }): Promise<Customer> {
  const res = await fetch(`${API_V1_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Müşteri eklenemedi')
  }
  return res.json()
}

export async function updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${API_V1_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Müşteri güncellenemedi')
  }
  return res.json()
}

export async function deleteCustomer(id: number): Promise<void> {
  const res = await fetch(`${API_V1_URL}/customers/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Müşteri silinemedi')
}

export async function getCustomerTransactions(customerId: number): Promise<CustomerTransaction[]> {
  const res = await fetch(`${API_V1_URL}/customers/${customerId}/transactions`)
  if (!res.ok) throw new Error('Müşteri hareketleri alınamadı')
  return res.json()
}

// ==================== PRODUCTS ====================

export async function getProducts(search?: string, category?: string, lowStockOnly = false): Promise<Product[]> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (category) params.append('category', category)
  if (lowStockOnly) params.append('low_stock_only', 'true')

  const res = await fetch(`${API_V1_URL}/products?${params.toString()}`)
  if (!res.ok) throw new Error('Ürünler alınamadı')
  return res.json()
}

export async function getProduct(id: number): Promise<Product> {
  const res = await fetch(`${API_V1_URL}/products/${id}`)
  if (!res.ok) throw new Error('Ürün bulunamadı')
  return res.json()
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_V1_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Ürün eklenemedi')
  }
  return res.json()
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_V1_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Ürün güncellenemedi')
  }
  return res.json()
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${API_V1_URL}/products/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Ürün silinemedi')
}

// ==================== SALES ====================

export async function getSales(search?: string, customerId?: number, paymentStatus?: string): Promise<Sale[]> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (customerId) params.append('customer_id', String(customerId))
  if (paymentStatus && paymentStatus !== 'all') params.append('payment_status', paymentStatus)

  const res = await fetch(`${API_V1_URL}/sales?${params.toString()}`)
  if (!res.ok) throw new Error('Satışlar alınamadı')
  return res.json()
}

export async function getSale(id: number): Promise<Sale> {
  const res = await fetch(`${API_V1_URL}/sales/${id}`)
  if (!res.ok) throw new Error('Satış detayı bulunamadı')
  return res.json()
}

export interface CreateSaleItemPayload {
  product_id: number
  quantity: number
  unit_price_cents?: number
}

export interface CreateSalePayload {
  sale_number?: string
  customer_id?: number | null
  paid_amount_cents?: number
  payment_method?: string
  notes?: string
  sale_date?: string
  items: CreateSaleItemPayload[]
}

export async function createSale(data: CreateSalePayload): Promise<Sale> {
  const res = await fetch(`${API_V1_URL}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Satış kaydedilemedi')
  }
  return res.json()
}

export async function cancelSale(id: number): Promise<Sale> {
  const res = await fetch(`${API_V1_URL}/sales/${id}/cancel`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Satış iptal edilemedi')
  }
  return res.json()
}

export interface TodaySalesSummary {
  date: string
  total_count: number
  total_amount_cents: number
  paid_amount_cents: number
  remaining_amount_cents: number
  sales: Array<{
    id: number
    sale_number: string
    customer_name: string
    total_cents: number
    paid_amount_cents: number
    remaining_amount_cents: number
    payment_status?: string
    payment_method: string
    sale_date: string
  }>
}

export async function getTodaySalesSummary(): Promise<TodaySalesSummary> {
  const res = await fetch(`${API_V1_URL}/sales/today-summary`)
  if (!res.ok) throw new Error('Bugünkü satış özeti alınamadı')
  return res.json()
}

export async function getExpenses(category?: string, startDate?: string, endDate?: string): Promise<Expense[]> {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.append('category', category)
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const res = await fetch(`${API_V1_URL}/expenses?${params.toString()}`)
  if (!res.ok) throw new Error('Giderler alınamadı')
  return res.json()
}

export async function createExpense(data: Partial<Expense>): Promise<Expense> {
  const res = await fetch(`${API_V1_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Gider eklenemedi')
  }
  return res.json()
}

export async function updateExpense(id: number, data: Partial<Expense>): Promise<Expense> {
  const res = await fetch(`${API_V1_URL}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Gider güncellenemedi')
  }
  return res.json()
}

export async function deleteExpense(id: number): Promise<void> {
  const res = await fetch(`${API_V1_URL}/expenses/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Gider silinemedi')
}

// ==================== COLLECTIONS ====================

export async function getCollections(customerId?: number, startDate?: string, endDate?: string): Promise<Collection[]> {
  const params = new URLSearchParams()
  if (customerId) params.append('customer_id', String(customerId))
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const res = await fetch(`${API_V1_URL}/collections?${params.toString()}`)
  if (!res.ok) throw new Error('Tahsilatlar alınamadı')
  return res.json()
}

export async function createCollection(data: Partial<Collection>): Promise<Collection> {
  const res = await fetch(`${API_V1_URL}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Tahsilat eklenemedi')
  }
  return res.json()
}

export async function deleteCollection(id: number): Promise<void> {
  const res = await fetch(`${API_V1_URL}/collections/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Tahsilat silinemedi')
}

// ==================== SETTINGS ====================

export async function getSettings(): Promise<Setting> {
  const res = await fetch(`${API_V1_URL}/settings`)
  if (!res.ok) throw new Error('Ayarlar alınamadı')
  return res.json()
}

export async function updateSettings(data: Partial<Setting>): Promise<Setting> {
  const res = await fetch(`${API_V1_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Ayarlar kaydedilemedi')
  return res.json()
}

// ==================== REPORTS & DASHBOARD ====================

export interface DashboardSummaryResponse {
  today: {
    sales_count: number
    sales_total_cents: number
    sales_paid_cents: number
    sales_remaining_cents: number
    expenses_total_cents: number
    collections_total_cents: number
  }
  month: {
    sales_total_cents: number
    expenses_total_cents: number
    collections_total_cents: number
    net_cash_flow_cents: number
  }
  counts: {
    customers: number
    products: number
    critical_stock_products: number
    total_receivables_cents: number
  }
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await fetch(`${API_V1_URL}/reports/dashboard-summary`)
  if (!res.ok) throw new Error('Dashboard özeti alınamadı')
  return res.json()
}

export async function getSalesReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  const res = await fetch(`${API_V1_URL}/reports/sales-report?${params.toString()}`)
  if (!res.ok) throw new Error('Satış raporu alınamadı')
  return res.json()
}

export async function getExpensesReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  const res = await fetch(`${API_V1_URL}/reports/expenses-report?${params.toString()}`)
  if (!res.ok) throw new Error('Gider raporu alınamadı')
  return res.json()
}

export async function getCollectionsReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  const res = await fetch(`${API_V1_URL}/reports/collections-report?${params.toString()}`)
  if (!res.ok) throw new Error('Tahsilat raporu alınamadı')
  return res.json()
}

export async function getCustomerSummaryReport() {
  const res = await fetch(`${API_V1_URL}/reports/customer-summary-report`)
  if (!res.ok) throw new Error('Müşteri özeti raporu alınamadı')
  return res.json()
}

export async function getProductSalesReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  const res = await fetch(`${API_V1_URL}/reports/product-sales-report?${params.toString()}`)
  if (!res.ok) throw new Error('Ürün satış raporu alınamadı')
  return res.json()
}

export async function getInventoryValuationReport() {
  const res = await fetch(`${API_V1_URL}/reports/inventory-valuation-report`)
  if (!res.ok) throw new Error('Envanter değerleme raporu alınamadı')
  return res.json()
}

export interface SalesChartDay {
  date: string
  display_date: string
  total_cents: number
  count: number
}

export interface SalesChartResponse {
  days: SalesChartDay[]
  total_period_cents: number
  total_period_count: number
}

export async function getSalesChartData(): Promise<SalesChartResponse> {
  const res = await fetch(`${API_V1_URL}/reports/sales-chart`)
  if (!res.ok) throw new Error('Grafik verisi alınamadı')
  return res.json()
}

// ==================== BACKUP & RESTORE ====================

export interface BackupItem {
  filename: string
  date: string
  size_bytes: number
  size_formatted: string
  is_valid: boolean
}

export async function getBackups(): Promise<BackupItem[]> {
  const res = await fetch(`${API_V1_URL}/backup`)
  if (!res.ok) throw new Error('Yedek listesi alınamadı')
  return res.json()
}

export async function createBackup(): Promise<BackupItem> {
  const res = await fetch(`${API_V1_URL}/backup/create`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Yedek alınamadı')
  }
  return res.json()
}

export async function restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_V1_URL}/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Geri yükleme başarısız oldu')
  }
  return res.json()
}

export function getBackupDownloadUrl(filename: string): string {
  return `${API_V1_URL}/backup/download/${encodeURIComponent(filename)}`
}

// ==================== CSV EXPORT ====================

export function getExportCsvUrl(entityType: string): string {
  return `${API_V1_URL}/export/csv/${entityType}`
}

