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
  Plus,
  Search,
  Calendar,
  Trash2,
  Info,
  RefreshCw,
  Eye,
} from 'lucide-react'
import {
  getCollections,
  createCollection,
  deleteCollection,
  getCustomers,
} from '../../services/api'
import { Collection, Customer } from '../../types/api'

export const PaymentsPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  // Form durumları
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [amountInput, setAmountInput] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('Nakit')
  const [collectionDate, setCollectionDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>('')

  // Tahsilatları yükle
  const loadCollections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCollections(
        undefined,
        startDate || undefined,
        endDate || undefined
      )
      setCollections(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tahsilatlar yüklenirken hata oluştu'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  // Müşterileri yükle
  const loadCustomersData = async () => {
    try {
      const cList = await getCustomers()
      setCustomers(cList)
      if (cList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(String(cList[0].id))
      }
    } catch {
      // sessizce geç
    }
  }

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const openAddModal = () => {
    loadCustomersData()
    setAmountInput('')
    setNotes('')
    setFormError(null)
    setCollectionDate(new Date().toISOString().split('T')[0])
    setPaymentMethod('Nakit')
    setIsAddModalOpen(true)
  }

  // Tahsilat Kaydet
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      setFormError('Lütfen ödeme yapan müşteriyi seçiniz.')
      return
    }

    const amtFloat = parseFloat(amountInput.replace(',', '.'))
    if (!amtFloat || amtFloat <= 0) {
      setFormError('Lütfen geçerli ve 0 dan büyük bir tahsilat tutarı giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      await createCollection({
        customer_id: parseInt(selectedCustomerId, 10),
        amount_cents: Math.round(amtFloat * 100),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        collection_date: collectionDate ? new Date(collectionDate).toISOString() : undefined,
      })

      setIsAddModalOpen(false)
      setSuccessMessage('Tahsilat başarıyla kaydedildi ve müşteri cari bakiyesi güncellendi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadCollections()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tahsilat kaydedilemedi'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Tahsilat Sil / İptal Et
  const handleDeleteCollection = async () => {
    if (!selectedCollection) return
    try {
      await deleteCollection(selectedCollection.id)
      setIsDeleteConfirmOpen(false)
      setSelectedCollection(null)
      setSuccessMessage('Tahsilat kaydı silindi ve cari bakiye düzeltildi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadCollections()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tahsilat silinemedi'
      setError(msg)
      setIsDeleteConfirmOpen(false)
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

  const selectedCustomer = customers.find((c) => String(c.id) === selectedCustomerId)

  const filteredCollections = collections.filter((c) => {
    const custName = c.customer_name || ''
    const matchesSearch =
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(c.id).includes(searchTerm)

    if (!matchesSearch) return false
    if (methodFilter !== 'all' && !c.payment_method.includes(methodFilter)) return false
    return true
  })

  const totalCollectedCents = filteredCollections.reduce((sum, c) => sum + c.amount_cents, 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tahsilatlar ve Kasa"
        description="Müşteri ödemeleri, makbuz kayıtları ve cari tahsilatlar"
        badge={<Badge variant="neutral">Kayıt: {filteredCollections.length}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadCollections}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={openAddModal}
            >
              Tahsilat Kaydet
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
      <div className="bg-white border border-surface-border rounded-lg p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Müşteri adı, not veya makbuz no ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
          <div className="w-full sm:w-44">
            <Select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Ödeme Şekilleri' },
                { value: 'Nakit', label: 'Nakit (Kasa)' },
                { value: 'Banka', label: 'Banka / Havale' },
                { value: 'Kredi Kartı', label: 'Kredi / Banka Kartı' },
              ]}
            />
          </div>
          <div className="w-full sm:w-36">
            <Input
              type="date"
              placeholder="Başlangıç"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-36">
            <Input
              type="date"
              placeholder="Bitiş"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Toplam Bilgi Şeridi */}
      {filteredCollections.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center text-xs">
          <span className="text-slate-600">
            Filtrelenen Tahsilat Sayısı: <strong>{filteredCollections.length}</strong>
          </span>
          <span className="text-slate-600">
            Toplam Tahsil Edilen:{' '}
            <strong className="text-emerald-700 font-bold tabular-nums text-sm">
              {formatMoney(totalCollectedCents)}
            </strong>
          </span>
        </div>
      )}

      {/* Tahsilat Tablosu */}
      {loading ? (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : filteredCollections.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Makbuz No</Th>
              <Th>Tarih</Th>
              <Th>Müşteri</Th>
              <Th align="center">Tahsilat Şekli</Th>
              <Th>Açıklama / Not</Th>
              <Th align="right">Tahsil Edilen Tutar</Th>
              <Th align="right">İşlemler</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredCollections.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    THS-{String(c.id).padStart(4, '0')}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(c.collection_date).toLocaleDateString('tr-TR')}
                  </span>
                </Td>
                <Td>
                  <span className="font-medium text-slate-900">{c.customer_name || 'Müşteri'}</span>
                </Td>
                <Td align="center">
                  <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {c.payment_method}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-slate-500 max-w-xs truncate block">
                    {c.notes || '-'}
                  </span>
                </Td>
                <Td align="right" tabular>
                  <span className="font-bold text-emerald-700">{formatMoney(c.amount_cents)}</span>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Detay Görüntüle"
                      className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                      onClick={() => {
                        setSelectedCollection(c)
                        setIsDetailModalOpen(true)
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Tahsilatı İptal Et / Sil"
                      className="p-1.5 h-auto text-slate-400 hover:text-rose-600"
                      onClick={() => {
                        setSelectedCollection(c)
                        setIsDeleteConfirmOpen(true)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <EmptyState
          title="Henüz tahsilat kaydı bulunmuyor"
          description={
            searchTerm || startDate || endDate
              ? 'Arama kriterlerinize uygun tahsilat kaydı bulunamadı.'
              : 'İşletmenize ait henüz bir tahsilat veya makbuz kaydedilmedi.'
          }
          actionText="Tahsilat Kaydet"
          onAction={openAddModal}
        />
      )}

      {/* Yeni Tahsilat Alma Modalı */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Müşteriden Tahsilat Kaydet"
        description="Ödeme yapan müşteriyi seçin, tutarı girin ve cari hesaba işleyin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              disabled={customers.length === 0}
              onClick={handleCreateCollection}
            >
              Tahsilatı Onayla ve Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCollection} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          {customers.length === 0 ? (
            <Alert variant="warning" title="Kayıtlı Müşteri Yok">
              Tahsilat kaydetmek için önce Müşteriler sayfasından bir müşteri eklemelisiniz.
            </Alert>
          ) : (
            <>
              <Select
                label="Ödeme Yapan Müşteri *"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: `${c.name}${c.company_name ? ` — ${c.company_name}` : ''} (Güncel Borç: ${formatMoney(c.balance_cents)})`,
                }))}
                required
              />

              {selectedCustomer && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded text-xs text-sky-900 flex items-center justify-between">
                  <span>Müşterinin Mevcut Borç Bakiyesi:</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(selectedCustomer.balance_cents)}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Tahsil Edilen Tutar (₺) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              required
            />
            <Select
              label="Tahsilat Şekli *"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'Nakit', label: 'Nakit (Kasa)' },
                { value: 'Banka / Havale', label: 'Banka Hesabı (Havale/EFT)' },
                { value: 'Kredi Kartı', label: 'Kredi / Banka Kartı' },
              ]}
            />
          </div>

          <Input
            label="İşlem Tarihi *"
            type="date"
            value={collectionDate}
            onChange={(e) => setCollectionDate(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Makbuz Açıklaması / Dekont Notu
            </label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-corporate-700 focus:outline-none"
              placeholder="Ödeme detayları, dekont numarası vb..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Tahsilat onaylandığında müşterinin cari borcu otomatik olarak düşecek ve cari ekstreye tahsilat kaydı işlenecektir.
            </span>
          </div>
        </form>
      </Modal>

      {/* Tahsilat Detay Modalı */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Tahsilat Makbuzu Detayı"
        description="Tahsilat işlemine ait kayıt ayrıntıları"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
            Kapat
          </Button>
        }
      >
        {selectedCollection && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Makbuz No:</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  THS-{String(selectedCollection.id).padStart(4, '0')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Müşteri:</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {selectedCollection.customer_name || 'Müşteri'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">İşlem Tarihi:</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {new Date(selectedCollection.collection_date).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Ödeme Şekli:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedCollection.payment_method}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Tahsil Edilen Tutar:</span>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">
                  {formatMoney(selectedCollection.amount_cents)}
                </p>
              </div>
            </div>
            {selectedCollection.notes && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500">Açıklama / Dekont Notu:</span>
                <p className="text-slate-800 mt-1">{selectedCollection.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* İptal Onay Penceresi */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCollection}
        title="Tahsilat Kaydını Sil / İptal Et"
        message={`THS-${String(selectedCollection?.id || '').padStart(4, '0')} nolu tahsilatı silmek istediğinize emin misiniz? Müşterinin cari borcu tahsil edilen tutar kadar tekrar artırılacaktır.`}
        confirmText="Evet, Sil ve Bakiyeyi Düzelt"
        variant="danger"
      />
    </div>
  )
}
