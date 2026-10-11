import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import {
  ShoppingCart,
  Users,
  Package,
  Receipt,
  Wallet,
  AlertTriangle,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import {
  getDashboardSummary,
  getTodaySalesSummary,
  getProducts,
  getSalesChartData,
  DashboardSummaryResponse,
  TodaySalesSummary,
  SalesChartResponse,
} from '../../services/api'
import { Product } from '../../types/api'

interface DashboardPageProps {
  onNavigate: (module: string) => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [todaySalesData, setTodaySalesData] = useState<TodaySalesSummary | null>(null)
  const [criticalProducts, setCriticalProducts] = useState<Product[]>([])
  const [chartData, setChartData] = useState<SalesChartResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashSum, todaySales, prods, chart] = await Promise.all([
        getDashboardSummary(),
        getTodaySalesSummary(),
        getProducts(undefined, undefined, true),
        getSalesChartData(),
      ])

      setSummary(dashSum)
      setTodaySalesData(todaySales)
      setCriticalProducts(prods.filter((p) => p.current_stock <= p.min_stock_level))
      setChartData(chart)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])


  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatMoney = (cents: number) => {
    return (
      (cents / 100).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' ₺'
    )
  }

  const todaySalesCount = summary?.today.sales_count ?? 0
  const todaySalesTotalCents = summary?.today.sales_total_cents ?? 0
  const todayExpensesTotalCents = summary?.today.expenses_total_cents ?? 0
  const todayCollectionsTotalCents = summary?.today.collections_total_cents ?? 0

  const monthSalesTotalCents = summary?.month.sales_total_cents ?? 0
  const monthCollectionsTotalCents = summary?.month.collections_total_cents ?? 0
  const monthExpensesTotalCents = summary?.month.expenses_total_cents ?? 0
  const monthNetCashFlowCents = summary?.month.net_cash_flow_cents ?? 0

  const totalCustomers = summary?.counts.customers ?? 0
  const totalProducts = summary?.counts.products ?? 0
  const totalReceivablesCents = summary?.counts.total_receivables_cents ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genel Bakış"
        description="Gozel Esnaf işletme kontrol merkezi ve canlı finansal göstergeler"
        badge={<Badge variant="success">Canlı Sistem</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadDashboardData}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ShoppingCart className="w-4 h-4" />}
              onClick={() => onNavigate('sales')}
            >
              Hızlı Satış Yap
            </Button>
          </div>
        }
      />

      {/* Hızlı İşlem Kısayolları Çubuğu */}
      <div className="bg-white border border-surface-border rounded-lg p-3.5 shadow-sm">
        <div className="text-xs font-semibold text-slate-700 mb-2.5">
          Hızlı Ticari İşlemler
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ShoppingCart className="w-3.5 h-3.5 text-corporate-800" />}
            onClick={() => onNavigate('sales')}
          >
            Yeni Satış
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Users className="w-3.5 h-3.5 text-corporate-800" />}
            onClick={() => onNavigate('customers')}
          >
            Yeni Müşteri ({totalCustomers})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Package className="w-3.5 h-3.5 text-corporate-800" />}
            onClick={() => onNavigate('products')}
          >
            Yeni Ürün ({totalProducts})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Wallet className="w-3.5 h-3.5 text-emerald-700" />}
            onClick={() => onNavigate('payments')}
          >
            Tahsilat Al
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Receipt className="w-3.5 h-3.5 text-rose-700" />}
            onClick={() => onNavigate('expenses')}
          >
            Gider Ekle
          </Button>
        </div>
      </div>

      {/* Bugünün Özeti Kartları */}
      <div>
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
          Bugünün Hareketleri
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Bugünkü Satışlar */}
          <div
            onClick={() => onNavigate('sales')}
            className="bg-white border border-surface-border rounded-lg p-4 shadow-sm hover:border-corporate-700 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Bugünkü Satışlar</span>
              <ShoppingCart className="w-4 h-4 text-corporate-800" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {formatMoney(todaySalesTotalCents)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{todaySalesCount} fiş kesildi</span>
                <span className="text-corporate-800 font-medium inline-flex items-center">
                  Fişler <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </p>
            </div>
          </div>

          {/* 2. Bugünkü Tahsilat */}
          <div
            onClick={() => onNavigate('payments')}
            className="bg-white border border-surface-border rounded-lg p-4 shadow-sm hover:border-emerald-600 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Bugünkü Tahsilat</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-emerald-700 tabular-nums">
                {formatMoney(todayCollectionsTotalCents)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Kasaya giren nakit/kart</span>
                <span className="text-emerald-700 font-medium inline-flex items-center">
                  Gör <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </p>
            </div>
          </div>

          {/* 3. Bugünkü Giderler */}
          <div
            onClick={() => onNavigate('expenses')}
            className="bg-white border border-surface-border rounded-lg p-4 shadow-sm hover:border-rose-600 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Bugünkü Giderler</span>
              <Receipt className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-rose-700 tabular-nums">
                {formatMoney(todayExpensesTotalCents)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Bugün yapılan harcamalar</span>
                <span className="text-rose-700 font-medium inline-flex items-center">
                  Gör <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </p>
            </div>
          </div>

          {/* 4. Toplam Müşteri Alacakları */}
          <div
            onClick={() => onNavigate('customers')}
            className="bg-white border border-surface-border rounded-lg p-4 shadow-sm hover:border-sky-600 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Açık Cari Alacaklar</span>
              <Users className="w-4 h-4 text-sky-700" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {formatMoney(totalReceivablesCents)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Müşterilerdeki toplam bakiye</span>
                <span className="text-sky-700 font-medium inline-flex items-center">
                  Cari <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bu Ayın Finansal Özeti Kartları */}
      <div>
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
          Bu Ayın Finansal Durumu
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block">Aylık Toplam Ciro</span>
            <span className="text-lg font-bold text-slate-900 mt-2 block tabular-nums">
              {formatMoney(monthSalesTotalCents)}
            </span>
          </div>

          <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block">Aylık Tahsilat</span>
            <span className="text-lg font-bold text-emerald-700 mt-2 block tabular-nums">
              {formatMoney(monthCollectionsTotalCents)}
            </span>
          </div>

          <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block">Aylık Giderler</span>
            <span className="text-lg font-bold text-rose-700 mt-2 block tabular-nums">
              {formatMoney(monthExpensesTotalCents)}
            </span>
          </div>

          <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block">Aylık Net Nakit Akışı</span>
            <span
              className={`text-lg font-bold mt-2 block tabular-nums ${
                monthNetCashFlowCents >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatMoney(monthNetCashFlowCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Son 7 Günlük Satış Trend Grafiği */}
      <div className="bg-white border border-surface-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Son 7 Günlük Satış Trendi
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Günlük tamamlanan fiş tutarları ve satış adedi
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">7 Günlük Toplam: </span>
              <strong className="text-slate-900 font-bold tabular-nums">
                {formatMoney(chartData?.total_period_cents || 0)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Toplam Fiş: </span>
              <strong className="text-slate-900 font-bold tabular-nums">
                {chartData?.total_period_count || 0}
              </strong>
            </div>
          </div>
        </div>

        {/* Kurumsal SVG Çizgi / Sütun Görseli */}
        <div className="mt-6">
          {chartData && chartData.days.length > 0 ? (
            <div>
              {/* Bar / Trend Grid */}
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 px-2">
                {(() => {
                  const maxCents = Math.max(...chartData.days.map((d) => d.total_cents), 1)
                  return chartData.days.map((d) => {
                    const heightPercent = Math.max(
                      d.total_cents > 0 ? Math.round((d.total_cents / maxCents) * 100) : 4,
                      4
                    )
                    return (
                      <div key={d.date} className="flex flex-col items-center h-full justify-end group">
                        <div className="text-[10px] sm:text-[11px] font-mono text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                          {formatMoney(d.total_cents)}
                        </div>
                        <div className="w-full bg-slate-100 rounded-t flex items-end h-32 p-0.5 sm:p-1 group-hover:bg-slate-200 transition">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t transition-all duration-500 ${
                              d.total_cents > 0
                                ? 'bg-corporate-800 group-hover:bg-corporate-900'
                                : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <span className="text-[11px] font-semibold text-slate-700 block whitespace-nowrap">
                            {d.display_date}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {d.count} fiş
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-slate-400">
              Grafik verisi yükleniyor...
            </div>
          )}
        </div>
      </div>


      {/* İki Sütunlu Düzen: Bugünkü Satışlar & Kritik Stoklar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bugünkü Satış Hareketleri Listesi */}
        <div className="bg-white border border-surface-border rounded-lg shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Bugünkü Satış Hareketleri ({todaySalesCount})
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-corporate-800 hover:text-corporate-900 font-semibold inline-flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {todaySalesData && todaySalesData.sales.length > 0 ? (
            <div className="divide-y divide-slate-100 flex-1 overflow-auto max-h-72">
              {todaySalesData.sales.map((s) => (
                <div key={s.id} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-semibold text-slate-800">{s.sale_number}</span>
                    <p className="text-slate-500 text-[11px]">{s.customer_name} • {s.payment_method}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatMoney(s.total_cents)}
                    </span>
                    {s.remaining_amount_cents <= 0 ? (
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        Ödendi
                      </p>
                    ) : (
                      <p className="text-[11px] text-rose-600 font-medium">
                        Kalan: {formatMoney(s.remaining_amount_cents)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-700">Bugün henüz satış yapılmadı</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                Yeni bir satış fişi kestiğinizde bugünkü işlemler burada anında görünecektir.
              </p>
            </div>
          )}
        </div>

        {/* Kritik Stok Takibi */}
        <div className="bg-white border border-surface-border rounded-lg shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Kritik Stok Seviyeleri ({criticalProducts.length})
            </h3>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs text-corporate-800 hover:text-corporate-900 font-semibold inline-flex items-center gap-1"
            >
              Tüm Ürünler <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {criticalProducts.length > 0 ? (
            <div className="divide-y divide-slate-100 flex-1 overflow-auto max-h-72">
              {criticalProducts.map((p) => (
                <div key={p.id} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <p className="text-slate-400 text-[11px] font-mono">Kod: {p.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-700 tabular-nums">
                      {p.current_stock} {p.unit}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Kritik sınır: {p.min_stock_level}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-700">Kritik seviyede ürün yok</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                Tüm ürünlerin stokları minimum seviyenin üzerindedir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Yerel Güvenlik ve Veritabanı Durum Özeti */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              Yerel Veri Saklama ve Güvenlik
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              data/gozel_esnaf.db (SQLite WAL Modu Aktif)
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Database className="w-3.5 h-3.5 text-slate-600" />}
            onClick={() => onNavigate('backup')}
          >
            Yedekleme Modülü
          </Button>
        </div>
      </div>
    </div>
  )
}
