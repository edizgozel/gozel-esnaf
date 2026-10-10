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
  PackagePlus,
  Search,
  Barcode,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/api'
import { Product } from '../../types/api'

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Seçili ürün
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Form durumları
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    cost_price: '', // TL olarak girilir
    sale_price: '', // TL olarak girilir
    current_stock: '',
    min_stock_level: '',
    unit: 'Adet',
  })

  // Ürünleri API'den yükleme
  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts(
        searchTerm || undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined,
        stockFilter === 'critical'
      )
      setProducts(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ürünler yüklenirken hata oluştu'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, categoryFilter, stockFilter])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Formu sıfırla
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category: '',
      cost_price: '',
      sale_price: '',
      current_stock: '0',
      min_stock_level: '5',
      unit: 'Adet',
    })
    setFormError(null)
  }

  // Yeni Ürün Ekleme
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim()) {
      setFormError('Lütfen ürün kodunu / barkodunu giriniz.')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Lütfen ürün adını giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      const costFloat = parseFloat(formData.cost_price.replace(',', '.')) || 0
      const saleFloat = parseFloat(formData.sale_price.replace(',', '.')) || 0

      await createProduct({
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category.trim() || undefined,
        cost_price_cents: Math.round(costFloat * 100),
        sale_price_cents: Math.round(saleFloat * 100),
        current_stock: parseInt(formData.current_stock, 10) || 0,
        min_stock_level: parseInt(formData.min_stock_level, 10) || 0,
        unit: formData.unit.trim() || 'Adet',
      })

      setIsAddModalOpen(false)
      resetForm()
      setSuccessMessage('Ürün kartı başarıyla eklendi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadProducts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ürün eklenirken hata oluştu'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Düzenleme modalını aç
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      code: product.code,
      name: product.name,
      category: product.category || '',
      cost_price: (product.cost_price_cents / 100).toFixed(2),
      sale_price: (product.sale_price_cents / 100).toFixed(2),
      current_stock: String(product.current_stock),
      min_stock_level: String(product.min_stock_level),
      unit: product.unit || 'Adet',
    })
    setFormError(null)
    setIsEditModalOpen(true)
  }

  // Ürün Güncelleme
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    if (!formData.code.trim()) {
      setFormError('Lütfen ürün kodunu giriniz.')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Lütfen ürün adını giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      const costFloat = parseFloat(formData.cost_price.replace(',', '.')) || 0
      const saleFloat = parseFloat(formData.sale_price.replace(',', '.')) || 0

      await updateProduct(selectedProduct.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category.trim() || undefined,
        cost_price_cents: Math.round(costFloat * 100),
        sale_price_cents: Math.round(saleFloat * 100),
        current_stock: parseInt(formData.current_stock, 10) || 0,
        min_stock_level: parseInt(formData.min_stock_level, 10) || 0,
        unit: formData.unit.trim() || 'Adet',
      })

      setIsEditModalOpen(false)
      resetForm()
      setSuccessMessage('Ürün bilgileri başarıyla güncellendi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadProducts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ürün güncellenirken hata oluştu'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Ürün Silme
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return
    try {
      await deleteProduct(selectedProduct.id)
      setIsConfirmOpen(false)
      setSelectedProduct(null)
      setSuccessMessage('Ürün başarıyla silindi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadProducts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ürün silinirken hata oluştu'
      setError(msg)
      setIsConfirmOpen(false)
    }
  }

  // Detay modalını aç
  const handleOpenDetail = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
  }

  // Kategoriler
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))
  )

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
        title="Ürünler ve Stok Listesi"
        description="Fiyatlandırma, mevcut stok seviyeleri ve kritik stok takibi"
        badge={<Badge variant="neutral">Ürün: {products.length}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadProducts}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<PackagePlus className="w-4 h-4" />}
              onClick={() => {
                resetForm()
                setIsAddModalOpen(true)
              }}
            >
              Yeni Ürün Ekle
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
      <div className="bg-white p-3 rounded-lg border border-surface-border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-72">
          <Input
            placeholder="Ürün adı veya kod ile ara..."
            leftIcon={<Search className="w-4 h-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
          <div className="w-full sm:w-44">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Kategoriler' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Stoklar' },
                { value: 'critical', label: 'Kritik Stoktakiler' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Yükleniyor Durumu */}
      {loading ? (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : products.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Ürün Kodu</Th>
              <Th>Ürün Adı & Kategori</Th>
              <Th align="right">Alış Fiyatı</Th>
              <Th align="right">Satış Fiyatı</Th>
              <Th align="center">Mevcut Stok</Th>
              <Th align="center">Stok Durumu</Th>
              <Th align="right">İşlemler</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((p) => {
              const isCritical = p.current_stock <= p.min_stock_level && p.current_stock > 0
              const isOut = p.current_stock <= 0

              return (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-corporate-850">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.code}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.category || 'Genel'}</div>
                  </Td>
                  <Td align="right" tabular>
                    <span className="text-xs text-slate-500">{formatMoney(p.cost_price_cents)}</span>
                  </Td>
                  <Td align="right" tabular>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(p.sale_price_cents)}
                    </span>
                  </Td>
                  <Td align="center" tabular>
                    <span className="font-bold text-slate-800">
                      {p.current_stock} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                    </span>
                  </Td>
                  <Td align="center">
                    {isOut ? (
                      <Badge variant="error" size="sm">Tükendi</Badge>
                    ) : isCritical ? (
                      <Badge variant="warning" size="sm">Kritik Stok</Badge>
                    ) : (
                      <Badge variant="success" size="sm">Yeterli</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Detay Görüntüle"
                        className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                        onClick={() => handleOpenDetail(p)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Ürünü Düzenle"
                        className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Ürünü Sil"
                        className="p-1.5 h-auto text-slate-400 hover:text-rose-600"
                        onClick={() => {
                          setSelectedProduct(p)
                          setIsConfirmOpen(true)
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      ) : (
        <EmptyState
          title="Henüz kayıt bulunmuyor"
          description={
            searchTerm
              ? 'Arama kriterlerinize uygun ürün bulunamadı.'
              : 'Henüz ürün veya stok kaydı eklenmedi.'
          }
          actionText="Yeni Ürün Ekle"
          onAction={() => {
            resetForm()
            setIsAddModalOpen(true)
          }}
        />
      )}

      {/* Yeni Ürün Ekleme Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Ürün Tanımla"
        description="Ürün kodunu, fiyatlarını ve başlangıç stok seviyesini belirleyin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              onClick={handleCreateProduct}
            >
              Ürünü Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Ürün Kodu / Barkod *"
              placeholder="Örn: URN-00105"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <Input
              label="Kategori"
              placeholder="Örn: Kırtasiye, Yedek Parça"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <Input
            label="Ürün Adı ve Tanımı *"
            placeholder="Örn: A4 Fotokopi Kağıdı 80 gr"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Birim Türü"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                { value: 'Adet', label: 'Adet' },
                { value: 'Paket', label: 'Paket' },
                { value: 'Koli', label: 'Koli' },
                { value: 'Kg', label: 'Kilogram (Kg)' },
                { value: 'Metre', label: 'Metre' },
              ]}
            />
            <Input
              label="Alış / Maliyet Fiyatı (₺)"
              placeholder="0.00"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            />
            <Input
              label="Satış Fiyatı (₺) *"
              placeholder="0.00"
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Başlangıç Stok Miktarı"
              type="number"
              value={formData.current_stock}
              onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
            />
            <Input
              label="Kritik Stok Sınırı"
              type="number"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Ürün Düzenleme Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Ürün Bilgilerini Düzenle"
        description="Fiyat, stok ve birim bilgilerini güncelleyin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              onClick={handleUpdateProduct}
            >
              Değişiklikleri Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateProduct} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Ürün Kodu / Barkod *"
              placeholder="Örn: URN-00105"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <Input
              label="Kategori"
              placeholder="Örn: Kırtasiye, Yedek Parça"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <Input
            label="Ürün Adı ve Tanımı *"
            placeholder="Örn: A4 Fotokopi Kağıdı 80 gr"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Birim Türü"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                { value: 'Adet', label: 'Adet' },
                { value: 'Paket', label: 'Paket' },
                { value: 'Koli', label: 'Koli' },
                { value: 'Kg', label: 'Kilogram (Kg)' },
                { value: 'Metre', label: 'Metre' },
              ]}
            />
            <Input
              label="Alış / Maliyet Fiyatı (₺)"
              placeholder="0.00"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            />
            <Input
              label="Satış Fiyatı (₺) *"
              placeholder="0.00"
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mevcut Stok Miktarı"
              type="number"
              value={formData.current_stock}
              onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
            />
            <Input
              label="Kritik Stok Sınırı"
              type="number"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Ürün Detay Modalı */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Ürün Detay Kartı"
        description="Ürünün tüm özellikleri ve mevcut durumu"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
            Kapat
          </Button>
        }
      >
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Ürün Kodu:</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedProduct.code}</p>
              </div>
              <div>
                <span className="text-slate-500">Kategori:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedProduct.category || 'Genel'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Ürün Adı:</span>
                <p className="font-semibold text-slate-900 mt-0.5 text-sm">{selectedProduct.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500">Alış Fiyatı:</span>
                <p className="font-bold text-slate-800 mt-1">{formatMoney(selectedProduct.cost_price_cents)}</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500">Satış Fiyatı:</span>
                <p className="font-bold text-corporate-850 mt-1">{formatMoney(selectedProduct.sale_price_cents)}</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500">Mevcut Stok:</span>
                <p className="font-bold text-slate-900 mt-1">
                  {selectedProduct.current_stock} {selectedProduct.unit}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Silme Onay Penceresi */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Ürünü Sil"
        message={`${selectedProduct?.name || 'Ürün'} adlı ürünü silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        variant="danger"
      />
    </div>
  )
}
