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
  UserPlus,
  Search,
  FileText,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactions,
} from '../../services/api'
import { Customer, CustomerTransaction } from '../../types/api'

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterBalance, setFilterBalance] = useState('all')

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false)

  // Seçili müşteri ve hareketler
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // Form durumları
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    initial_balance: '', // TL olarak girilir, kuruşa çevrilir
  })

  // Müşterileri API'den yükleme
  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCustomers(searchTerm || undefined, true)
      setCustomers(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Müşteriler yüklenirken hata oluştu'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Formu sıfırla
  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      tax_id: '',
      initial_balance: '',
    })
    setFormError(null)
  }

  // Yeni Müşteri Ekleme
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Lütfen müşteri adını giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      const balanceFloat = parseFloat(formData.initial_balance.replace(',', '.')) || 0
      const initialBalanceCents = Math.round(balanceFloat * 100)

      await createCustomer({
        name: formData.name.trim(),
        company_name: formData.company_name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        initial_balance_cents: initialBalanceCents,
      })

      setIsAddModalOpen(false)
      resetForm()
      setSuccessMessage('Müşteri kartı başarıyla oluşturuldu.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadCustomers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Müşteri eklenirken hata oluştu'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Düzenleme modalını aç
  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name || '',
      company_name: customer.company_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      tax_id: customer.tax_id || '',
      initial_balance: '',
    })
    setFormError(null)
    setIsEditModalOpen(true)
  }

  // Müşteri Güncelleme
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    if (!formData.name.trim()) {
      setFormError('Lütfen müşteri adını giriniz.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      await updateCustomer(selectedCustomer.id, {
        name: formData.name.trim(),
        company_name: formData.company_name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
      })

      setIsEditModalOpen(false)
      resetForm()
      setSuccessMessage('Müşteri bilgileri başarıyla güncellendi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadCustomers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Müşteri güncellenirken hata oluştu'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Müşteri Silme
  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return
    try {
      await deleteCustomer(selectedCustomer.id)
      setIsConfirmOpen(false)
      setSelectedCustomer(null)
      setSuccessMessage('Müşteri başarıyla silindi.')
      setTimeout(() => setSuccessMessage(null), 4000)
      loadCustomers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Müşteri silinirken hata oluştu'
      setError(msg)
      setIsConfirmOpen(false)
    }
  }

  // Cari Hareketleri Gösterme
  const handleOpenTransactions = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsTransactionsModalOpen(true)
    setLoadingTransactions(true)
    try {
      const data = await getCustomerTransactions(customer.id)
      setTransactions(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hareketler yüklenemedi'
      setError(msg)
    } finally {
      setLoadingTransactions(false)
    }
  }

  // Borç filtresi
  const filteredCustomers = customers.filter((c) => {
    if (filterBalance === 'debtor') return c.balance_cents > 0
    if (filterBalance === 'zero') return c.balance_cents === 0
    return true
  })

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
        title="Müşteriler (Cari Hesaplar)"
        description="Müşteri kartları, borç/alacak bakiyeleri ve iletişim kayıtları"
        badge={<Badge variant="neutral">Kayıt: {filteredCustomers.length}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadCustomers}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                resetForm()
                setIsAddModalOpen(true)
              }}
            >
              Yeni Müşteri Ekle
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
      <div className="bg-white p-3 rounded-lg border border-surface-border shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="İsim, firma veya telefon ara..."
            leftIcon={<Search className="w-4 h-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={filterBalance}
            onChange={(e) => setFilterBalance(e.target.value)}
            options={[
              { value: 'all', label: 'Tüm Bakiyeler' },
              { value: 'debtor', label: 'Sadece Borçlu Olanlar' },
              { value: 'zero', label: 'Bakiyesi Sıfır Olanlar' },
            ]}
          />
        </div>
      </div>

      {/* Yükleniyor Durumu */}
      {loading ? (
        <div className="bg-white border border-surface-border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : filteredCustomers.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Müşteri / Ticari Unvan</Th>
              <Th>İletişim Bilgileri</Th>
              <Th>Adres / Konum</Th>
              <Th align="right">Güncel Bakiye</Th>
              <Th align="center">Durum</Th>
              <Th align="right">İşlemler</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredCustomers.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  {c.company_name && (
                    <div className="text-xs text-slate-500 truncate max-w-xs">{c.company_name}</div>
                  )}
                </Td>
                <Td>
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {!c.phone && !c.email && (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </Td>
                <Td>
                  {c.address ? (
                    <div className="flex items-center gap-1 text-xs text-slate-600 max-w-xs truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </Td>
                <Td align="right" tabular>
                  <span
                    className={`font-semibold ${
                      c.balance_cents > 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}
                  >
                    {formatMoney(c.balance_cents)}
                  </span>
                </Td>
                <Td align="center">
                  <Badge variant={c.balance_cents > 0 ? 'error' : 'success'} size="sm">
                    {c.balance_cents > 0 ? 'Borçlu' : 'Dengede'}
                  </Badge>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Cari Ekstre Görüntüle"
                      className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                      onClick={() => handleOpenTransactions(c)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Kartı Düzenle"
                      className="p-1.5 h-auto text-slate-500 hover:text-slate-800"
                      onClick={() => handleOpenEdit(c)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Müşteriyi Sil"
                      className="p-1.5 h-auto text-slate-400 hover:text-rose-600"
                      onClick={() => {
                        setSelectedCustomer(c)
                        setIsConfirmOpen(true)
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
          title="Henüz kayıt bulunmuyor"
          description={
            searchTerm
              ? 'Arama kriterlerinize uygun müşteri kaydı bulunamadı.'
              : 'Henüz müşteri veya cari hesap kaydı eklenmedi.'
          }
          actionText="Yeni Müşteri Ekle"
          onAction={() => {
            resetForm()
            setIsAddModalOpen(true)
          }}
        />
      )}

      {/* Yeni Müşteri Ekleme Modalı */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Müşteri Tanımla"
        description="Cari hesap kartı ve iletişim bilgilerini girin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              onClick={handleCreateCustomer}
            >
              Müşteriyi Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Müşteri Adı / Yetkili *"
              placeholder="Örn: Ahmet Yılmaz"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Ticari Unvan / Firma"
              placeholder="Örn: Yılmaz Ticaret Ltd. Şti."
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefon Numarası"
              placeholder="Örn: 0532 555 12 34"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="E-posta Adresi"
              type="email"
              placeholder="ornek@firma.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vergi No / T.C. Kimlik No"
              placeholder="Vergi kimlik numarası"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            />
            <Input
              label="Açılış Borç Bakiyesi (₺)"
              placeholder="0.00"
              value={formData.initial_balance}
              onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adres Açıklaması
            </label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-corporate-700 focus:outline-none"
              placeholder="Mahalle, cadde, sokak ve kapı no..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Müşteri Düzenleme Modalı */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Müşteri Kartını Düzenle"
        description="Müşteri ve iletişim bilgilerini güncelleyin"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSubmitting}
              onClick={handleUpdateCustomer}
            >
              Değişiklikleri Kaydet
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-3.5">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Müşteri Adı / Yetkili *"
              placeholder="Örn: Ahmet Yılmaz"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Ticari Unvan / Firma"
              placeholder="Örn: Yılmaz Ticaret Ltd. Şti."
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefon Numarası"
              placeholder="Örn: 0532 555 12 34"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="E-posta Adresi"
              type="email"
              placeholder="ornek@firma.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Input
              label="Vergi No / T.C. Kimlik No"
              placeholder="Vergi kimlik numarası"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adres Açıklaması
            </label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-corporate-700 focus:outline-none"
              placeholder="Mahalle, cadde, sokak ve kapı no..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Cari Hareketler (Ekstre) Modalı */}
      <Modal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
        title={`Cari Hesap Ekstresi — ${selectedCustomer?.name || ''}`}
        description="Müşteriye ait tüm borç, alacak ve tahsilat hareketleri"
        maxWidth="2xl"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsTransactionsModalOpen(false)}>
            Kapat
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Müşteri: </span>
              <span className="font-semibold text-slate-900">{selectedCustomer?.name}</span>
            </div>
            <div>
              <span className="text-slate-500">Güncel Bakiye: </span>
              <span className="font-bold text-rose-700 tabular-nums">
                {selectedCustomer ? formatMoney(selectedCustomer.balance_cents) : '0,00 ₺'}
              </span>
            </div>
          </div>

          {loadingTransactions ? (
            <div className="py-8 text-center text-slate-400 text-xs">Hareketler yükleniyor...</div>
          ) : transactions.length > 0 ? (
            <div className="border border-surface-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-surface-border text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-2.5">Tarih</th>
                    <th className="p-2.5">İşlem Türü</th>
                    <th className="p-2.5">Açıklama</th>
                    <th className="p-2.5 text-right">Tutar</th>
                    <th className="p-2.5 text-right">Kalan Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-2.5 text-slate-600">
                        {new Date(t.transaction_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">{t.transaction_type}</td>
                      <td className="p-2.5 text-slate-500">{t.description || '-'}</td>
                      <td className="p-2.5 text-right font-semibold tabular-nums text-slate-800">
                        {formatMoney(t.amount_cents)}
                      </td>
                      <td className="p-2.5 text-right font-bold tabular-nums text-rose-700">
                        {formatMoney(t.balance_after_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Bu müşteriye ait henüz cari hesap hareketi bulunmuyor.
            </div>
          )}
        </div>
      </Modal>

      {/* Silme Onay Penceresi */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Müşteriyi Sil"
        message={`${selectedCustomer?.name || 'Müşteri'} adlı müşteriyi silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        variant="danger"
      />
    </div>
  )
}
