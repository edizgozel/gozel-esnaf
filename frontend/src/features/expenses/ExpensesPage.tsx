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
  Edit,
  Tag,
  RefreshCw,
  Eye,
} from 'lucide-react'
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../services/api'
import { Expense } from '../../types/api'

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  // Form durumları
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    category: 'Kira',
    amount: '',
    payment_method: 'Nakit',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  })

  // Giderleri API'den yükleme
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getExpenses(
        categoryFilter !== 'all' ? categoryFilter : undefined,
        startDate || undefined,
        endDate || undefined
      )
      setExpenses(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giderler yüklenirken hata oluştu'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, startDate, endDate])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const resetForm = () => {
    setFormData({
      category: 'Kira',
      amount: '',
      payment_method: 'Nakit',
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
    })
    setFormError(null)
  }

  // Yeni Gider Ekle
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountFloat = parseFloat(formData.amount.replace(',', '.'))
    if (!amountFloat || amountFloat <= 0) {
      setFormError('Lütfen geçerli ve 0 dan büyük bir tutar giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      await createExpense({
        category: formData.category,
        amount_cents: Math.round(amountFloat * 100),
        payment_method: formData.payment_method,
        description: formData.description.trim() || undefined,
        expense_date: formData.expense_date ? new Date(formData.expense_date).toISOString() : undefined,
      })

      setIsAddModalOpen(false)
      resetForm()
      setSuccessMessage('Gider kaydı başarıyla oluşturuldu.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadExpenses()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gider kaydedilemedi'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Düzenleme Aç
  const handleOpenEdit = (exp: Expense) => {
    setSelectedExpense(exp)
    setFormData({
      category: exp.category,
      amount: (exp.amount_cents / 100).toFixed(2),
      payment_method: exp.payment_method,
      description: exp.description || '',
      expense_date: new Date(exp.expense_date).toISOString().split('T')[0],
    })
    setFormError(null)
    setIsEditModalOpen(true)
  }

  // Gider Güncelle
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExpense) return
    const amountFloat = parseFloat(formData.amount.replace(',', '.'))
    if (!amountFloat || amountFloat <= 0) {
      setFormError('Lütfen geçerli ve 0 dan büyük bir tutar giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      await updateExpense(selectedExpense.id, {
        category: formData.category,
        amount_cents: Math.round(amountFloat * 100),
        payment_method: formData.payment_method,
        description: formData.description.trim() || undefined,
        expense_date: formData.expense_date ? new Date(formData.expense_date).toISOString() : undefined,
      })

      setIsEditModalOpen(false)
      resetForm()
      setSuccessMessage('Gider kaydı güncellendi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadExpenses()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gider güncellenemedi'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Gider Sil
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return
    try {
      await deleteExpense(selectedExpense.id)
      setIsDeleteConfirmOpen(false)
      setSelectedExpense(null)
      setSuccessMessage('Gider kaydı başarıyla silindi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadExpenses()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gider silinemedi'
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

  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (e.description && e.description.toLowerCase().includes(term)) ||
      e.category.toLowerCase().includes(term) ||
      e.payment_method.toLowerCase().includes(term)
    )
  })

  const totalExpenseCents = filteredExpenses.reduce((sum, e) => sum + e.amount_cents, 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gider Yönetimi"
        description="Dükkan ve işletme harcamaları, faturalar ve sabit giderler"
        badge={<Badge variant="neutral">Kayıt: {filteredExpenses.length}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadExpenses}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetForm()
                setIsAddModalOpen(true)
              }}
            >
              Yeni Gider Ekle
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

      {/* Filtre ve Arama */}
      <div className="bg-white border border-surface-border rounded-lg p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Açıklama, kategori veya ödeme şekli ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
          <div className="w-full sm:w-44">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Kategoriler' },
                { value: 'Kira', label: 'Kira' },
                { value: 'Fatura (Elektrik)', label: 'Fatura (Elektrik/Su)' },
                { value: 'Ofis ve Sarf Malzeme', label: 'Ofis ve Sarf Malzeme' },
                { value: 'Personel', label: 'Personel / Maaş' },
                { value: 'Nakliye / Kargo', label: 'Nakliye / Kargo' },
                { value: 'Diğer', label: 'Diğer Harcamalar' },
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
      {filteredExpenses.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center text-xs">
          <span className="text-slate-600">
            Filtrelenen Gider Sayısı: <strong>{filteredExpenses.length}</strong>
          </span>
          <span className="text-slate-600">
            Toplam Harcama Tutarı:{' '}
            <strong className="text-rose-700 font-bold tabular-nums text-sm">
              {formatMoney(totalExpenseCents)}
            </strong>
          </span>
        </div>
      )}

      {/* Gider Tablosu */}
      {loading ? (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : filteredExpenses.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Tarih</Th>
              <Th>Kategori</Th>
              <Th>Açıklama</Th>
              <Th align="center">Ödeme Şekli</Th>
              <Th align="right">Tutar</Th>
              <Th align="right">İşlemler</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredExpenses.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(e.expense_date).toLocaleDateString('tr-TR')}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {e.category}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-slate-600 max-w-sm truncate block">
                    {e.description || '-'}
                  </span>
                </Td>
                <Td align="center">
                  <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {e.payment_method}
                  </span>
                </Td>
                <Td align="right" tabular>
                  <span className="font-bold text-rose-700">{formatMoney(e.amount_cents)}</span>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Detay Görüntüle"
                      className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                      onClick={() => {
                        setSelectedExpense(e)
                        setIsDetailModalOpen(true)
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Düzenle"
                      className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                      onClick={() => handleOpenEdit(e)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Sil"
                      className="p-1.5 h-auto text-slate-400 hover:text-rose-600"
                      onClick={() => {
                        setSelectedExpense(e)
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
          title="Henüz gider kaydı bulunmuyor"
          description={
            searchTerm || categoryFilter !== 'all' || startDate || endDate
              ? 'Arama ve filtre kriterlerinize uygun gider kaydı bulunamadı.'
              : 'İşletmenize ait henüz bir harcama veya gider kaydedilmedi.'
          }
          actionText="Yeni Gider Ekle"
          onAction={() => {
            resetForm()
            setIsAddModalOpen(true)
          }}
        />
      )}

      {/* Yeni Gider Ekleme Modalı */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Gider Kaydı Ekle"
        description="Fatura, kira, personel veya işletme harcaması kaydedin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              onClick={handleCreateExpense}
            >
              Gideri Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateExpense} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Gider Kategorisi *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Kira', label: 'Kira' },
                { value: 'Fatura (Elektrik)', label: 'Fatura (Elektrik/Su/Doğalgaz)' },
                { value: 'Ofis ve Sarf Malzeme', label: 'Ofis ve Sarf Malzeme' },
                { value: 'Personel', label: 'Personel / Maaş' },
                { value: 'Nakliye / Kargo', label: 'Nakliye / Kargo' },
                { value: 'Diğer', label: 'Diğer Harcamalar' },
              ]}
              required
            />
            <Input
              label="Tutar (₺) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Ödeme Şekli *"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              options={[
                { value: 'Nakit', label: 'Nakit (Kasa)' },
                { value: 'Banka / Havale', label: 'Banka / Havale / EFT' },
                { value: 'Kredi Kartı', label: 'Kredi / Banka Kartı' },
              ]}
            />
            <Input
              label="İşlem Tarihi *"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gider Açıklaması
            </label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-corporate-700 focus:outline-none"
              placeholder="Örn: Ekim ayı dükkan kirası, fatura abone no vb..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Gider Düzenleme Modalı */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Gider Kaydını Düzenle"
        description="Gider kategorisi, tutar ve açıklamasını güncelleyin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              onClick={handleUpdateExpense}
            >
              Değişiklikleri Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateExpense} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Gider Kategorisi *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Kira', label: 'Kira' },
                { value: 'Fatura (Elektrik)', label: 'Fatura (Elektrik/Su/Doğalgaz)' },
                { value: 'Ofis ve Sarf Malzeme', label: 'Ofis ve Sarf Malzeme' },
                { value: 'Personel', label: 'Personel / Maaş' },
                { value: 'Nakliye / Kargo', label: 'Nakliye / Kargo' },
                { value: 'Diğer', label: 'Diğer Harcamalar' },
              ]}
              required
            />
            <Input
              label="Tutar (₺) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Ödeme Şekli *"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              options={[
                { value: 'Nakit', label: 'Nakit (Kasa)' },
                { value: 'Banka / Havale', label: 'Banka / Havale / EFT' },
                { value: 'Kredi Kartı', label: 'Kredi / Banka Kartı' },
              ]}
            />
            <Input
              label="İşlem Tarihi *"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gider Açıklaması
            </label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-corporate-700 focus:outline-none"
              placeholder="Açıklama..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Detay Modalı */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Gider Detayı"
        description="Gider işlemine ait kayıt ayrıntıları"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
            Kapat
          </Button>
        }
      >
        {selectedExpense && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Kategori:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedExpense.category}</p>
              </div>
              <div>
                <span className="text-slate-500">Tarih:</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {new Date(selectedExpense.expense_date).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Ödeme Şekli:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedExpense.payment_method}</p>
              </div>
              <div>
                <span className="text-slate-500">Harcama Tutarı:</span>
                <p className="font-bold text-rose-700 text-sm mt-0.5">
                  {formatMoney(selectedExpense.amount_cents)}
                </p>
              </div>
            </div>
            {selectedExpense.description && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500">Açıklama / Not:</span>
                <p className="text-slate-800 mt-1">{selectedExpense.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Silme Onay Penceresi */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteExpense}
        title="Gider Kaydını Sil"
        message="Bu gider kaydını silmek istediğinize emin misiniz?"
        confirmText="Evet, Sil"
        variant="danger"
      />
    </div>
  )
}
