import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { HealthResponse } from '../types/api'

interface MainLayoutProps {
  children: React.ReactNode
  currentModule: string
  onSelectModule: (id: string) => void
  health: HealthResponse | null
  loadingHealth: boolean
  onRefreshHealth: () => void
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentModule,
  onSelectModule,
  health,
  loadingHealth,
  onRefreshHealth,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-muted">
      {/* Sol Menü */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={onSelectModule}
      />

      {/* Ana Gövde */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Üst Bar */}
        <Header
          health={health}
          loadingHealth={loadingHealth}
          onRefreshHealth={onRefreshHealth}
        />

        {/* İçerik Alanı */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

