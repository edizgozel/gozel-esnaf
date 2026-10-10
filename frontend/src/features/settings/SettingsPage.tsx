import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  Building2,
  Coins,
  Shield,
  Save,
  RefreshCw,
} from 'lucide-react'
import { getSettings, updateSettings } from '../../services/api'
import { Setting } from '../../types/api'

export const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')
  const [currencyCode, setCurrencyCode] = useState('TRY')
  const [currencySymbol, setCurrencySymbol] = useState('₺')
  const [noteFooter, setNoteFooter] = useState('')
  const [allowNegativeStock, setAllowNegativeStock] = useState('false')

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: Setting = await getSettings()
      setBusinessName(data.business_name || '')
      setPhone(data.phone || '')
      setEmail(data.email || '')
      setTaxId(data.tax_id || '')
      setAddress(data.address || '')
      setCurrencyCode(data.currency_code || 'TRY')
      setCurrencySymbol(data.currency_symbol || '₺')
      setNoteFooter(data.note_footer || '')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ayarlar yüklenemedi'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await updateSettings({
        business_name: businessName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        tax_id: taxId.trim() || null,
        address: address.trim() || null,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        note_footer: noteFooter.trim() || null,
      })
      setSuccessMsg('İşletme ve uygulama ayarları başarıyla kaydedildi.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ayarlar kaydedilemedi'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="İşletme ve Uygulama Ayarları"
        description="İşletme kimlik bilgileri, para birimi ve temel uygulama tercihleri"
        badge={<Badge variant="success">Kalıcı Veritabanı</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadSettings}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={handleSave}
            >
              Ayarları Kaydet
            </Button>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. İşletme Tanımı */}
          <div className="bg-white border border-surface-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border text-sm font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-corporate-800" />
              <span>İşletme Kimlik Bilgileri</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="İşletme Adı / Ticari Unvan"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Örn: Gozel Ticaret"
                helperText="Satış fişlerinde ve ekstrelerde başlık olarak görünür"
              />
              <Input
                label="Vergi Numarası / TCKN"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Vergi No veya TCKN"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@isletme.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İşletme Adresi
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="İşletme açık adresi..."
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-corporate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Para Birimi ve Bölgesel Format */}
          <div className="bg-white border border-surface-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border text-sm font-bold text-slate-800">
              <Coins className="w-4 h-4 text-corporate-800" />
              <span>Para Birimi ve Hesaplama Standartları</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Varsayılan Para Birimi"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                options={[
                  { value: 'TRY', label: 'TRY — Türk Lirası (₺)' },
                  { value: 'USD', label: 'USD — ABD Doları ($)' },
                  { value: 'EUR', label: 'EUR — Euro (€)' },
                ]}
              />
              <Input
                label="Para Birimi Sembolü"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />
              <Select
                label="Kuruş Ondalık Basamağı"
                value="2"
                disabled
                options={[
                  { value: '2', label: '2 Basamak (Örn: 100,50 ₺)' },
                ]}
              />
            </div>
          </div>

          {/* 3. Güvenlik ve Stok Kuralları */}
          <div className="bg-white border border-surface-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border text-sm font-bold text-slate-800">
              <Shield className="w-4 h-4 text-corporate-800" />
              <span>Ticari İş Kuralları</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Eksi Stoka İzin Verilsin mi?"
                value={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.value)}
                helperText="Varsayılan olarak stok adedinin eksiye düşmesi engellenir"
                options={[
                  { value: 'false', label: 'Hayır — Yetersiz Stokta Satışı Engelle (Önerilen)' },
                  { value: 'true', label: 'Evet — Eksi Stokla Satışa İzin Ver' },
                ]}
              />
              <Input
                label="Satış Fişi Alt Bilgi Notu"
                value={noteFooter}
                onChange={(e) => setNoteFooter(e.target.value)}
                placeholder="Örn: Bizi tercih ettiğiniz için teşekkür ederiz."
                helperText="Yazdırılan fişlerin en altında gösterilir"
              />
            </div>
          </div>

          {/* 4. Marka ve Yazılım Künyesi */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Gozel Software" className="w-8 h-8 object-contain" />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Gozel Esnaf — Sürüm v0.1.0
                </div>
                <div className="text-[11px] text-slate-500">
                  Geliştirici: Gozel Software • Yerel SQLite Modu
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">127.0.0.1:8000</span>
          </div>
        </form>
      )}
    </div>
  )
}
