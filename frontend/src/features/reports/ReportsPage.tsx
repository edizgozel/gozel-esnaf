import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { Skeleton } from '../../components/ui/Skeleton'
import { Alert } from '../../components/ui/Alert'
import {
  BarChart3,
  Filter,
  RefreshCw,
  Download,
} from 'lucide-react'
import {
  getSalesReport,
  getExpensesReport,
  getCollectionsReport,
  getCustomerSummaryReport,
  getProductSalesReport,
  getInventoryValuationReport,
  getExportCsvUrl,
} from '../../services/api'

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('sales')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)

  const reportOptions = [
    { value: 'sales', label: 'Dönemsel Satış ve Ciro Raporu', entity: 'sales' },
    { value: 'expenses', label: 'Kategori Bazlı Gider Raporu', entity: 'expenses' },
    { value: 'collections', label: 'Tahsilat ve Kasa Raporu', entity: 'collections' },
    { value: 'customers', label: 'Müşteri Borç / Bakiye Listesi', entity: 'customers' },
    { value: 'products', label: 'Ürün Bazında Satış Performansı', entity: 'sale_items' },
    { value: 'inventory', label: 'Stok ve Envanter Değerleme Raporu', entity: 'products' },
  ]

  const currentEntity = reportOptions.find((r) => r.value === reportType)?.entity || 'sales'

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (reportType === 'sales') {
        data = await getSalesReport(startDate, endDate)
      } else if (reportType === 'expenses') {
        data = await getExpensesReport(startDate, endDate)
      } else if (reportType === 'collections') {
        data = await getCollectionsReport(startDate, endDate)
      } else if (reportType === 'customers') {
        data = await getCustomerSummaryReport()
      } else if (reportType === 'products') {
        data = await getProductSalesReport(startDate, endDate)
      } else if (reportType === 'inventory') {
        data = await getInventoryValuationReport()
      }
      setReportData(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rapor oluşturulamadı'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [reportType, startDate, endDate])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const formatMoney = (cents: number) => {
    return (
      (cents / 100).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' ₺'
    )
  }

  const setQuickDates = (type: 'today' | 'this_month' | 'last_month') => {
    const now = new Date()
    if (type === 'today') {
      const today = now.toISOString().split('T')[0]
      setStartDate(today)
      setEndDate(today)
    } else if (type === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      setStartDate(first)
      setEndDate(last)
    } else if (type === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      setStartDate(first)
      setEndDate(last)
    }
  }

  const isDateFiltered = ['sales', 'expenses', 'collections', 'products'].includes(reportType)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finansal Raporlar"
        description="Canlı veritabanı kayıtları üzerinden satış, gider, tahsilat ve bakiye analizleri"
        badge={<Badge variant="success">Canlı Raporlama</Badge>}
        action={
          <div className="flex items-center gap-2">
            <a
              href={getExportCsvUrl(currentEntity)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-surface-border rounded-md hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-corporate-800" />
              CSV Olarak İndir
            </a>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadReport}
            >
              Raporu Yenile
            </Button>
          </div>
        }
      />


      {error && <Alert variant="error">{error}</Alert>}

      {/* Rapor Filtreleme Paneli */}
      <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-corporate-800" />
          Rapor Kriterleri
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={isDateFiltered ? 'lg:col-span-2' : 'lg:col-span-4'}>
            <Select
              label="Rapor Türü"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={reportOptions}
            />
          </div>
          {isDateFiltered && (
            <>
              <div>
                <Input
                  label="Başlangıç Tarihi"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Bitiş Tarihi"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {isDateFiltered && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickDates('today')}
                className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={() => setQuickDates('this_month')}
                className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
              >
                Bu Ay
              </button>
              <button
                type="button"
                onClick={() => setQuickDates('last_month')}
                className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
              >
                Geçen Ay
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              onClick={loadReport}
            >
              Filtrele
            </Button>
          </div>
        )}
      </div>

      {/* Rapor İçeriği */}
      <div className="bg-white border border-surface-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {reportOptions.find((r) => r.value === reportType)?.label}
            </h3>
            {isDateFiltered && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dönem: {startDate} — {endDate}
              </p>
            )}
          </div>
          <Badge variant="neutral">Kayıt: {reportData?.items?.length || 0}</Badge>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <div>
            {/* 1. SATIŞ RAPORU */}
            {reportType === 'sales' && (
              <div>
                {reportData && reportData.items && reportData.items.length > 0 ? (
                  <>
                    <div className="p-4 bg-sky-50 border-b border-sky-100 grid grid-cols-3 text-xs">
                      <div>
                        <span className="text-sky-800 font-semibold">Toplam Fiş:</span>
                        <p className="text-base font-bold text-slate-900">{reportData.total_count}</p>
                      </div>
                      <div>
                        <span className="text-sky-800 font-semibold">Tahsil Edilen:</span>
                        <p className="text-base font-bold text-emerald-700">{formatMoney(reportData.paid_cents)}</p>
                      </div>
                      <div>
                        <span className="text-sky-800 font-semibold">Toplam Ciro:</span>
                        <p className="text-base font-bold text-slate-900">{formatMoney(reportData.total_cents)}</p>
                      </div>
                    </div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Fiş No</Th>
                          <Th>Tarih</Th>
                          <Th>Müşteri</Th>
                          <Th align="center">Ödeme Şekli</Th>
                          <Th align="right">Tahsil Edilen</Th>
                          <Th align="right">Kalan Borç</Th>
                          <Th align="right">Toplam Tutar</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {reportData.items.map((it: any) => (
                          <Tr key={it.id}>
                            <Td><span className="font-mono text-xs font-semibold">{it.sale_number}</span></Td>
                            <Td>{it.date}</Td>
                            <Td className="font-medium text-slate-900">{it.customer_name}</Td>
                            <Td align="center"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{it.payment_method}</span></Td>
                            <Td align="right" tabular className="text-emerald-700">{formatMoney(it.paid_amount_cents)}</Td>
                            <Td align="right" tabular className={it.remaining_amount_cents > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}>
                              {formatMoney(it.remaining_amount_cents)}
                            </Td>
                            <Td align="right" tabular className="font-bold text-slate-900">{formatMoney(it.total_cents)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Seçilen tarih aralığında satış kaydı bulunamadı.
                  </div>
                )}
              </div>
            )}

            {/* 2. GİDER RAPORU */}
            {reportType === 'expenses' && (
              <div>
                {reportData && reportData.items && reportData.items.length > 0 ? (
                  <>
                    <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center text-xs">
                      <span className="text-rose-900 font-medium">Toplam Gider Adedi: <strong>{reportData.total_count}</strong></span>
                      <span className="text-rose-900 font-medium">
                        Toplam Harcama: <strong className="text-rose-700 text-base font-bold ml-1">{formatMoney(reportData.total_cents)}</strong>
                      </span>
                    </div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Tarih</Th>
                          <Th>Kategori</Th>
                          <Th>Açıklama</Th>
                          <Th align="center">Ödeme Şekli</Th>
                          <Th align="right">Tutar</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {reportData.items.map((it: any) => (
                          <Tr key={it.id}>
                            <Td>{it.date}</Td>
                            <Td className="font-semibold text-slate-800">{it.category}</Td>
                            <Td className="text-slate-600">{it.description}</Td>
                            <Td align="center"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{it.payment_method}</span></Td>
                            <Td align="right" tabular className="font-bold text-rose-700">{formatMoney(it.amount_cents)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Seçilen tarih aralığında gider kaydı bulunamadı.
                  </div>
                )}
              </div>
            )}

            {/* 3. TAHSİLAT RAPORU */}
            {reportType === 'collections' && (
              <div>
                {reportData && reportData.items && reportData.items.length > 0 ? (
                  <>
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center text-xs">
                      <span className="text-emerald-900 font-medium">Tahsilat Makbuzu Sayısı: <strong>{reportData.total_count}</strong></span>
                      <span className="text-emerald-900 font-medium">
                        Toplam Tahsil Edilen: <strong className="text-emerald-700 text-base font-bold ml-1">{formatMoney(reportData.total_cents)}</strong>
                      </span>
                    </div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Makbuz No</Th>
                          <Th>Tarih</Th>
                          <Th>Müşteri</Th>
                          <Th align="center">Ödeme Şekli</Th>
                          <Th>Not / Açıklama</Th>
                          <Th align="right">Tutar</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {reportData.items.map((it: any) => (
                          <Tr key={it.id}>
                            <Td><span className="font-mono text-xs font-semibold">{it.receipt_number}</span></Td>
                            <Td>{it.date}</Td>
                            <Td className="font-medium text-slate-900">{it.customer_name}</Td>
                            <Td align="center"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{it.payment_method}</span></Td>
                            <Td className="text-slate-500">{it.notes}</Td>
                            <Td align="right" tabular className="font-bold text-emerald-700">{formatMoney(it.amount_cents)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Seçilen tarih aralığında tahsilat kaydı bulunamadı.
                  </div>
                )}
              </div>
            )}

            {/* 4. MÜŞTERİ BAKİYE LİSTESİ */}
            {reportType === 'customers' && (
              <div>
                {reportData && reportData.items && reportData.items.length > 0 ? (
                  <>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-700">Toplam Kayıtlı Müşteri: <strong>{reportData.total_customers}</strong></span>
                      <span className="text-slate-700">
                        Piyasadaki Toplam Alacak: <strong className="text-rose-700 text-base font-bold ml-1">{formatMoney(reportData.total_receivable_cents)}</strong>
                      </span>
                    </div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Müşteri Adı</Th>
                          <Th>Ticari Unvan</Th>
                          <Th>Telefon</Th>
                          <Th align="center">Toplam Satış Sayısı</Th>
                          <Th align="right">Güncel Bakiye</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {reportData.items.map((it: any) => (
                          <Tr key={it.id}>
                            <Td className="font-medium text-slate-900">{it.name}</Td>
                            <Td className="text-slate-500">{it.company_name}</Td>
                            <Td className="text-slate-600">{it.phone}</Td>
                            <Td align="center"><span className="font-bold">{it.sales_count}</span></Td>
                            <Td align="right" tabular className={it.balance_cents > 0 ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                              {formatMoney(it.balance_cents)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Kayıtlı müşteri bulunamadı.
                  </div>
                )}
              </div>
            )}

            {/* 5. ÜRÜN SATIŞ PERFORMANSI */}
            {reportType === 'products' && (
              <div>
                {reportData && reportData.items && reportData.items.length > 0 ? (
                  <>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-700">Toplam Satılan Ürün Çeşidi: <strong>{reportData.total_products_sold}</strong></span>
                      <span className="text-slate-700">Toplam Satılan Adet: <strong>{reportData.total_quantity}</strong></span>
                      <span className="text-slate-700">
                        Toplam Ürün Geliri: <strong className="text-slate-900 text-base font-bold ml-1">{formatMoney(reportData.total_revenue_cents)}</strong>
                      </span>
                    </div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Ürün Adı</Th>
                          <Th align="center">Satılan Miktar</Th>
                          <Th align="right">Toplam Hasılat (Ciro)</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {reportData.items.map((it: any) => (
                          <Tr key={it.product_id}>
                            <Td className="font-medium text-slate-900">{it.product_name}</Td>
                            <Td align="center" className="font-bold">{it.total_quantity}</Td>
                            <Td align="right" tabular className="font-bold text-slate-900">{formatMoney(it.total_cents)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Seçilen dönemde ürün satışı bulunamadı.
                  </div>
                )}
              </div>
            )}

            {/* 6. ENVANTER DEĞERLEME */}
            {reportType === 'inventory' && (
              <div>
                {reportData && reportData.items && reportData.items.length > 0 ? (
                  <>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Kayıtlı Ürün Çeşidi:</span>
                        <strong className="text-slate-900 text-sm">{reportData.total_unique_products}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Toplam Maliyet Değeri:</span>
                        <strong className="text-slate-900 text-sm">{formatMoney(reportData.total_cost_value_cents)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Toplam Satış Değeri:</span>
                        <strong className="text-corporate-850 text-sm">{formatMoney(reportData.total_sale_value_cents)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Beklenen Brüt Kâr:</span>
                        <strong className="text-emerald-700 text-sm">{formatMoney(reportData.estimated_potential_profit_cents)}</strong>
                      </div>
                    </div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Ürün Kodu</Th>
                          <Th>Ürün Adı & Kategori</Th>
                          <Th align="center">Mevcut Stok</Th>
                          <Th align="right">Birim Alış</Th>
                          <Th align="right">Birim Satış</Th>
                          <Th align="right">Toplam Maliyet</Th>
                          <Th align="right">Toplam Satış Değeri</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {reportData.items.map((it: any) => (
                          <Tr key={it.id}>
                            <Td><span className="font-mono text-xs">{it.code}</span></Td>
                            <Td>
                              <div className="font-medium text-slate-900">{it.name}</div>
                              <div className="text-[11px] text-slate-400">{it.category}</div>
                            </Td>
                            <Td align="center">
                              <span className="font-bold">{it.current_stock}</span> <span className="text-[11px] text-slate-500">{it.unit}</span>
                            </Td>
                            <Td align="right" tabular>{formatMoney(it.cost_price_cents)}</Td>
                            <Td align="right" tabular>{formatMoney(it.sale_price_cents)}</Td>
                            <Td align="right" tabular className="font-medium text-slate-700">{formatMoney(it.cost_value_cents)}</Td>
                            <Td align="right" tabular className="font-bold text-corporate-850">{formatMoney(it.sale_value_cents)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Kayıtlı ürün bulunamadı.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
