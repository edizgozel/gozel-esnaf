import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { HealthResponse } from '../types/api'

interface HeaderProps {
  health: HealthResponse | null
  loadingHealth: boolean
  onRefreshHealth: () => void
}

export const Header: React.FC<HeaderProps> = ({
  health,
  loadingHealth,
  onRefreshHealth,
}) => {
  // Güncel Türkçe tarih
  const todayFormatted = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  const isConnected = health?.status === 'ok'

  return (
    <header className="h-16 bg-white border-b border-surface-border px-6 flex items-center justify-between shrink-0">
      {/* Sol: İşletme Başlığı ve Tarih */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-corporate-800 bg-corporate-50 px-2 py-0.5 rounded border border-corporate-200">
            Yerel Ön Muhasebe
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-600 font-medium capitalize">
            {todayFormatted}
          </span>
        </div>
      </div>

      {/* Sağ: Sistem ve Servis Durum Göstergesi */}
      <div className="flex items-center gap-3">
        {/* Backend Durumu */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
          title={health?.error || (health ? 'FastAPI ve SQLite çalışıyor' : 'Bağlantı kontrol ediliyor...')}
        >
          {isConnected ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>
            {loadingHealth
              ? 'Kontrol ediliyor...'
              : isConnected
              ? 'Backend & SQLite Aktif'
              : 'Backend Bağlantısı Yok'}
          </span>
          {health?.database && (
            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1 py-0.2 rounded font-mono">
              {health.database.journal_mode}
            </span>
          )}
        </div>

        {/* Yenile Butonu */}
        <button
          onClick={onRefreshHealth}
          disabled={loadingHealth}
          title="Bağlantı durumunu yeniden kontrol et"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  )
}
