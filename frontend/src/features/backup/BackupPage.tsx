import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Alert } from '../../components/ui/Alert'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  Calendar,
  AlertCircle,
  FileCheck,
  Plus,
  RefreshCw,
} from 'lucide-react'
import {
  getBackups,
  createBackup,
  restoreBackup,
  getBackupDownloadUrl,
  BackupItem,
} from '../../services/api'

export const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null)

  const loadBackupsList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getBackups()
      setBackups(list)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Yedek listesi yüklenemedi'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBackupsList()
  }, [loadBackupsList])

  const handleCreateBackup = async () => {
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const newBackup = await createBackup()
      setSuccessMsg(`Yedek başarıyla oluşturuldu: ${newBackup.filename}`)
      await loadBackupsList()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Yedek oluşturulamadı'
      setError(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmRestore = async () => {
    if (!selectedBackup) return
    setIsRestoreConfirmOpen(false)
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await restoreBackup(selectedBackup.filename)
      setSuccessMsg(res.message || 'Veritabanı başarıyla geri yüklendi')
      await loadBackupsList()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Geri yükleme işlemi başarısız'
      setError(msg)
    } finally {
      setActionLoading(false)
      setSelectedBackup(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yedekleme ve Veri Yönetimi"
        description="SQLite veritabanı yedekleri, dosya bütünlüğü ve güvenli geri yükleme"
        badge={<Badge variant="success">WAL Günlük Modu</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadBackupsList}
            >
              Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              loading={actionLoading}
              onClick={handleCreateBackup}
            >
              Şimdi Yedek Al
            </Button>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {/* Veri Güvenliği Bilgilendirme Kutusu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <HardDrive className="w-4 h-4 text-corporate-800" />
            <span>Aktif Veritabanı Konumu</span>
          </div>
          <div className="mt-2 text-xs font-mono font-semibold text-slate-800 truncate">
            data/gozel_esnaf.db
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Yerel SQLite 3 dosya sistemi
          </p>
        </div>

        <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Database className="w-4 h-4 text-emerald-700" />
            <span>Yedek Deposu</span>
          </div>
          <div className="mt-2 text-xs font-mono font-semibold text-slate-800 truncate">
            backups/ (Zaman Damgalı .db)
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Kayıtlı {backups.length} adet yedek dosyası
          </p>
        </div>

        <div className="bg-white border border-surface-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-corporate-800" />
            <span>Bütünlük Koruması</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-800">
            PRAGMA integrity_check
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Bozuk yedekler otomatik olarak engellenir
          </p>
        </div>
      </div>

      {/* Yedek Listesi Tablosu */}
      <div className="bg-white border border-surface-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Kayıtlı Yedek Dosyaları ({backups.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">backups/ dizini</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center">
            <Database className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-medium text-slate-700">Henüz yedek dosyası oluşturulmamış</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Yukarıdaki "Şimdi Yedek Al" butonuna tıklayarak ilk yedeğinizi oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Yedek Dosyası</Th>
                <Th>Oluşturulma Tarihi</Th>
                <Th align="center">Boyut</Th>
                <Th align="center">Dosya Bütünlüğü</Th>
                <Th align="right">İşlemler</Th>
              </Tr>
            </Thead>
            <Tbody>
              {backups.map((b) => (
                <Tr key={b.filename}>
                  <Td>
                    <span className="font-mono text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      {b.filename}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {b.date}
                    </span>
                  </Td>
                  <Td align="center">
                    <span className="font-mono text-xs text-slate-600">{b.size_formatted}</span>
                  </Td>
                  <Td align="center">
                    {b.is_valid ? (
                      <Badge variant="success" size="sm">Doğrulandı</Badge>
                    ) : (
                      <Badge variant="error" size="sm">Bozuk</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<RotateCcw className="w-3.5 h-3.5 text-corporate-800" />}
                        disabled={!b.is_valid || actionLoading}
                        onClick={() => {
                          setSelectedBackup(b)
                          setIsRestoreConfirmOpen(true)
                        }}
                      >
                        Geri Yükle
                      </Button>
                      <a
                        href={getBackupDownloadUrl(b.filename)}
                        download={b.filename}
                        className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                        title="Yedek Dosyasını İndir"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        <div className="p-4 bg-slate-50 border-t border-surface-border text-xs text-slate-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Güvenli Geri Yükleme Protokolü:</strong> Geri yükleme işlemi yapılmadan hemen önce mevcut çalışan veritabanının anlık bir güvenlik yedeği otomatik alınır. Yüklenecek dosya SQLite bütünlük testinden geçmezse işlem durdurulur.
          </p>
        </div>
      </div>

      {/* Geri Yükleme Onay Penceresi */}
      <ConfirmDialog
        isOpen={isRestoreConfirmOpen}
        onClose={() => {
          setIsRestoreConfirmOpen(false)
          setSelectedBackup(null)
        }}
        onConfirm={handleConfirmRestore}
        title="Veritabanını Geri Yükle"
        message={`${selectedBackup?.filename || 'Yedek'} dosyasından veritabanı geri yüklenecektir. Bu işlem mevcut veritabanının üzerine yazacaktır. Devam etmeden önce otomatik güvenlik yedeği alınacaktır. Onaylıyor musunuz?`}
        confirmText="Evet, Geri Yükle"
        variant="warning"
      />
    </div>
  )
}


