import React from 'react'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  BarChart3,
  Database,
  Settings,
  ShieldCheck,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  currentModule: string
  onSelectModule: (id: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentModule, onSelectModule }) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'customers', label: 'Müşteriler', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: 'Ürünler ve Stok', icon: <Package className="w-4 h-4" /> },
    { id: 'sales', label: 'Satışlar', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'expenses', label: 'Giderler', icon: <Receipt className="w-4 h-4" /> },
    { id: 'payments', label: 'Tahsilatlar', icon: <Wallet className="w-4 h-4" /> },
    { id: 'reports', label: 'Raporlar', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'backup', label: 'Yedekleme', icon: <Database className="w-4 h-4" /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <aside className="w-60 bg-white border-r border-surface-border flex flex-col shrink-0 select-none">
      {/* Marka ve Logo Alanı */}
      <div className="h-16 px-4 border-b border-surface-border flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Gozel Software Logo"
            className="w-9 h-9 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
            Gozel Esnaf
          </h1>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            Gozel Software
          </p>
        </div>
      </div>

      {/* Navigasyon Listesi */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menü
        </div>

        {navItems.map((item) => {
          const isSelected = currentModule === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-md font-medium transition-colors ${
                isSelected
                  ? 'bg-corporate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className={isSelected ? 'text-white' : 'text-slate-500'}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Alt Bilgi & Güvenlik Kartı */}
      <div className="p-3 border-t border-surface-border">
        <div className="bg-surface-muted rounded-md p-2.5 border border-surface-border">
          <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Yerel Çalışma Modu</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Verileriniz bilgisayarınızda yerel SQLite veritabanında saklanır.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>v0.1.0</span>
            <span>127.0.0.1:8000</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
