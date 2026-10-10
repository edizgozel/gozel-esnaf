import React, { useState, useEffect } from 'react'
import { MainLayout } from './layouts/MainLayout'
import { checkBackendHealth } from './services/api'
import { HealthResponse } from './types/api'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { CustomersPage } from './features/customers/CustomersPage'
import { ProductsPage } from './features/products/ProductsPage'
import { SalesPage } from './features/sales/SalesPage'
import { ExpensesPage } from './features/expenses/ExpensesPage'
import { PaymentsPage } from './features/payments/PaymentsPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { BackupPage } from './features/backup/BackupPage'
import { SettingsPage } from './features/settings/SettingsPage'

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<string>('dashboard')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true)

  const fetchHealth = async () => {
    setLoadingHealth(true)
    const result = await checkBackendHealth()
    setHealth(result)
    setLoadingHealth(false)
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const renderActivePage = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentModule} />
      case 'customers':
        return <CustomersPage />
      case 'products':
        return <ProductsPage />
      case 'sales':
        return <SalesPage />
      case 'expenses':
        return <ExpensesPage />
      case 'payments':
        return <PaymentsPage />
      case 'reports':
        return <ReportsPage />
      case 'backup':
        return <BackupPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage onNavigate={setCurrentModule} />
    }
  }

  return (
    <MainLayout
      currentModule={currentModule}
      onSelectModule={setCurrentModule}
      health={health}
      loadingHealth={loadingHealth}
      onRefreshHealth={fetchHealth}
    >
      {renderActivePage()}
    </MainLayout>
  )
}
