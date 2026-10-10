import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Alert } from '../../components/ui/Alert'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  ShoppingCart,
  Search,
  FileText,
  XCircle,
  Plus,
  Calendar,
  Trash2,
  RefreshCw,
  Info,
} from 'lucide-react'
import {
  getSales,
  createSale,
  cancelSale,
  getCustomers,
  getProducts,
} from '../../services/api'
import { Sale, Customer, Product } from '../../types/api'

interface CartItem {
  product: Product
  quantity: number
  unit_price_cents: number
}

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')

  // Modallar
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  // Satış formu durumları
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<string>('Nakit')
  const [paidAmountInput, setPaidAmountInput] = useState<string>('')
  const [saleNotes, setSaleNotes] = useState<string>('')

  // Sepet
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedQty, setSelectedQty] = useState<number>(1)

  // Satışları yükle
  const loadSales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSales(searchTerm || undefined, undefined, paymentFilter !== 'all' ? paymentFilter : undefined)
      setSales(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Satışlar yüklenirken hata oluştu'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, paymentFilter])

  // Müşterileri ve ürünleri yükle (sepet için)
  const loadFormData = async () => {
    try {
      const [cList, pList] = await Promise.all([getCustomers(), getProducts(undefined, undefined, false)])
      setCustomers(cList)
      setProducts(pList)
    } catch {
      // sessizce geç
    }
  };

  useEffect(() => {
    loadSales()
  }, [loadSales])

  const openNewSaleModal = () => {
    loadFormData()
    setCart([])
    setSelectedCustomerId('')
    setSaleDate(new Date().toISOString().split('T')[0])
    setPaymentMethod('Nakit')
    setPaidAmountInput('')
    setSaleNotes('')
    setSelectedProductId('')
    setSelectedQty(1)
    setFormError(null)
    setIsNewSaleOpen(true)
  }

  // Sepete ürün ekle
  const handleAddToCart = () => {
    if (!selectedProductId) return
    const prod = products.find((p) => String(p.id) === selectedProductId)
    if (!prod) return

    if (selectedQty <= 0) {
      setFormError('Lütfen geçerli bir miktar giriniz.')
      return
    }

    // Mevcut sepet miktarını da hesaba kat
    const existing = cart.find((i) => i.product.id === prod.id)
    const totalQty = (existing ? existing.quantity : 0) + selectedQty

    if (prod.current_stock < totalQty) {
      setFormError(
        `Yetersiz stok: '${prod.name}' için mevcut stok yalnızca ${prod.current_stock} ${prod.unit}.`
      )
      return
    }

    setFormError(null)
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === prod.id
            ? { ...item, quantity: item.quantity + selectedQty }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          product: prod,
          quantity: selectedQty,
          unit_price_cents: prod.sale_price_cents,
        },
      ])
    }

    setSelectedProductId('')
    setSelectedQty(1)
  }

  // Sepetten ürün çıkar
  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  // Sepet toplamını hesapla (kuruş)
  const cartSubtotalCents = cart.reduce(
    (sum, item) => sum + item.unit_price_cents * item.quantity,
    0
  )

  // Satışı Tamamla ve Gönder
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setFormError('Lütfen sepete en az bir ürün ekleyiniz.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const paidFloat = parseFloat(paidAmountInput.replace(',', '.')) || 0
      const paidCents = Math.round(paidFloat * 100)

      await createSale({
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        paid_amount_cents: paidCents,
        payment_method: paymentMethod,
        notes: saleNotes.trim() || undefined,
        sale_date: saleDate ? new Date(saleDate).toISOString() : undefined,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
        })),
      })

      setIsNewSaleOpen(false)
      setSuccessMessage('Satış işlemi ve stok güncellemeleri başarıyla tamamlandı.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadSales()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Satış kaydedilemedi'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Satışı İptal Et
  const handleCancelSale = async () => {
    if (!selectedSale) return
    try {
      await cancelSale(selectedSale.id)
      setIsCancelConfirmOpen(false)
      setSelectedSale(null)
      setSuccessMessage('Satış başarıyla iptal edildi ve ürünler stoğa iade edildi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadSales()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Satış iptal edilemedi'
      setError(msg)
      setIsCancelConfirmOpen(false)
    }
  }

  const formatMoney = (cents: number) => {
    return (
      (cents / 100).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' ₺'
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Satış İşlemleri"
        description="Satış fişleri, tahsilat durumları ve sepet işlemleri"
        badge={<Badge variant="neutral">Kayıt: {sales.length}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadSales}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ShoppingCart className="w-4 h-4" />}
              onClick={openNewSaleModal}
            >
              Yeni Satış Yap
            </Button>
          </div>
        }
      />

      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Arama ve Filtreleme */}
      <div className="bg-white border border-surface-border rounded-lg p-3 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Fiş no veya müşteri adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tüm Ödeme Durumları' },
              { value: 'Ödendi', label: 'Tamamı Ödenenler' },
              { value: 'Kısmi Ödendi', label: 'Kısmi Ödenenler' },
              { value: 'Bekliyor', label: 'Borç / Bekleyenler' },
            ]}
          />
        </div>
      </div>

      {/* Satışlar Tablosu */}
      {loading ? (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : sales.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Fiş No</Th>
              <Th>Tarih</Th>
              <Th>Müşteri</Th>
              <Th align="right">Toplam Tutar</Th>
              <Th align="right">Peşin Tahsilat</Th>
              <Th align="right">Kalan Borç</Th>
              <Th align="center">Ödeme Şekli</Th>
              <Th align="center">Durum</Th>
              <Th align="right">İşlemler</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sales.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {s.sale_number}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(s.sale_date).toLocaleDateString('tr-TR')}
                  </span>
                </Td>
                <Td>
                  <span className="font-medium text-slate-900">
                    {s.customer_name || 'Perakende Müşteri'}
                  </span>
                </Td>
                <Td align="right" tabular>
                  <span className="font-bold text-slate-900">{formatMoney(s.total_cents)}</span>
                </Td>
                <Td align="right" tabular>
                  <span className="text-emerald-700 font-medium">
                    {formatMoney(s.paid_amount_cents)}
                  </span>
                </Td>
                <Td align="right" tabular>
                  <span
                    className={`font-semibold ${
                      s.remaining_amount_cents > 0 ? 'text-rose-700' : 'text-slate-500'
                    }`}
                  >
                    {formatMoney(s.remaining_amount_cents)}
                  </span>
                </Td>
                <Td align="center">
                  <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {s.payment_method}
                  </span>
                </Td>
                <Td align="center">
                  <Badge variant={s.status === 'Tamamlandı' ? 'success' : 'error'} size="sm">
                    {s.status}
                  </Badge>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Satış Fişi Detayı"
                      className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                      onClick={() => {
                        setSelectedSale(s)
                        setIsDetailOpen(true)
                      }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                    {s.status === 'Tamamlandı' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Satışı İptal Et (Stok İadesi)"
                        className="p-1.5 h-auto text-slate-400 hover:text-rose-600"
                        onClick={() => {
                          setSelectedSale(s)
                          setIsCancelConfirmOpen(true)
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <EmptyState
          title="Henüz satış kaydı bulunmuyor"
          description={
            searchTerm
              ? 'Arama kriterlerine uygun satış bulunmuyor.'
              : 'Henüz sisteme satış fişi kaydedilmedi.'
          }
          actionText="Yeni Satış Yap"
          onAction={openNewSaleModal}
        />
      )}

      {/* Yeni Satış Modalı (Sepet Tasarımı) */}
      <Modal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        title="Yeni Satış Fişi Düzenle"
        description="Müşteri seçin, ürünleri sepete ekleyin ve ödeme yöntemini belirleyin"
        maxWidth="2xl"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsNewSaleOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ShoppingCart className="w-4 h-4" />}
              loading={submitting}
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
            >
              Satışı Onayla ve Tamamla
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          {/* Müşteri ve Fiş Başlığı */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="sm:col-span-2">
              <Select
                label="Müşteri Seçimi"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                options={[
                  { value: '', label: 'Perakende Müşteri (Cari Hesapsız / Peşin)' },
                  ...customers.map((c) => ({
                    value: String(c.id),
                    label: `${c.name}${c.company_name ? ` — ${c.company_name}` : ''} (Borç: ${formatMoney(c.balance_cents)})`,
                  })),
                ]}
              />
            </div>
            <div>
              <Input
                label="Satış Tarihi"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
          </div>

          {/* Ürün Seçme ve Sepete Ekleme Alanı */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Sepete Ürün Ekle
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-7">
                <Select
                  label="Ürün Seçiniz"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  options={[
                    { value: '', label: 'Ürün seçiniz...' },
                    ...products.map((p) => ({
                      value: String(p.id),
                      label: `${p.name} [Stok: ${p.current_stock} ${p.unit}] — ${formatMoney(p.sale_price_cents)}`,
                    })),
                  ]}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Miktar"
                  type="number"
                  min="1"
                  value={String(selectedQty)}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddToCart}
                  disabled={!selectedProductId}
                >
                  Ekle
                </Button>
              </div>
            </div>
          </div>

          {/* Sepet / Kalemler Tablosu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Satış Kalemleri (Sepet: {cart.length} Ürün)
              </span>
            </div>

            <div className="border border-surface-border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-surface-border text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-2.5">Ürün</th>
                    <th className="p-2.5 w-24 text-center">Birim Fiyat</th>
                    <th className="p-2.5 w-20 text-center">Miktar</th>
                    <th className="p-2.5 w-24 text-right">Tutar</th>
                    <th className="p-2.5 w-10 text-center">Sil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <tr key={item.product.id}>
                        <td className="p-2.5 font-medium text-slate-900">
                          {item.product.name}
                          <span className="block text-[11px] text-slate-400 font-normal">
                            Kod: {item.product.code}
                          </span>
                        </td>
                        <td className="p-2.5 text-center tabular-nums">
                          {formatMoney(item.unit_price_cents)}
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          {item.quantity} {item.product.unit}
                        </td>
                        <td className="p-2.5 text-right font-bold tabular-nums">
                          {formatMoney(item.unit_price_cents * item.quantity)}
                        </td>
                        <td className="p-2.5 text-center text-slate-400 hover:text-rose-600 cursor-pointer">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        Sepette henüz ürün bulunmuyor. Yukarıdan ürün seçip ekleyin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hesaplama ve Ödeme Bölümü */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div className="space-y-2.5">
              <Select
                label="Ödeme Şekli"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'Nakit', label: 'Nakit (Kasa)' },
                  { value: 'Kredi Kartı', label: 'Kredi / Banka Kartı' },
                  { value: 'Havale', label: 'Banka Havalesi / EFT' },
                  { value: 'Açık Hesap', label: 'Veresiye / Açık Hesap (Borç)' },
                ]}
              />
              <Input
                label="Peşin Tahsil Edilen Tutar (₺)"
                type="number"
                step="0.01"
                placeholder={formatMoney(cartSubtotalCents).replace(' ₺', '')}
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
              />
              <Input
                label="Satış Açıklaması / Fiş Notu"
                placeholder="İsteğe bağlı not..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
              />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs h-fit">
              <div className="flex justify-between text-slate-600">
                <span>Ara Toplam:</span>
                <span className="font-semibold tabular-nums">{formatMoney(cartSubtotalCents)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Genel Toplam:</span>
                <span className="tabular-nums text-corporate-850">
                  {formatMoney(cartSubtotalCents)}
                </span>
              </div>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Satış kaydedildiğinde stoklar anında düşülecektir.
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Satış Detay Modalı */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Satış Detayı — ${selectedSale?.sale_number || ''}`}
        description="Satış fişine ait tarihsel kalemler ve ödeme bilgileri"
        maxWidth="2xl"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
            Kapat
          </Button>
        }
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Müşteri:</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {selectedSale.customer_name || 'Perakende'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Tarih:</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {new Date(selectedSale.sale_date).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Ödeme Şekli:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedSale.payment_method}</p>
              </div>
              <div>
                <span className="text-slate-500">Durum:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedSale.status}</p>
              </div>
            </div>

            {/* Kalemler */}
            <div className="border border-surface-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-surface-border text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-2.5">Satılan Ürün</th>
                    <th className="p-2.5 text-center">Birim Fiyat</th>
                    <th className="p-2.5 text-center">Miktar</th>
                    <th className="p-2.5 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-medium text-slate-900">{it.product_name}</td>
                      <td className="p-2.5 text-center tabular-nums">
                        {formatMoney(it.unit_price_cents)}
                      </td>
                      <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                      <td className="p-2.5 text-right font-bold tabular-nums">
                        {formatMoney(it.line_total_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Toplam Özeti */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Peşin Tahsilat: </span>
                <span className="font-bold text-emerald-700">
                  {formatMoney(selectedSale.paid_amount_cents)}
                </span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Kalan Borç: </span>
                <span className="font-bold text-rose-700">
                  {formatMoney(selectedSale.remaining_amount_cents)}
                </span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Toplam: </span>
                <span className="text-base font-bold text-slate-900">
                  {formatMoney(selectedSale.total_cents)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Satış İptali Onay Penceresi */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelSale}
        title="Satışı İptal Et"
        message={`${selectedSale?.sale_number || 'Satış'} nolu satışı iptal etmek istediğinize emin misiniz? Satıştaki ürünler otomatik olarak stoğa iade edilecek ve varsa müşteri borcu silinecektir.`}
        confirmText="Evet, Satışı İptal Et"
        variant="danger"
      />
    </div>
  )
}
