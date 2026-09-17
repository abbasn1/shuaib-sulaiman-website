import { useLayoutEffect } from 'react'
import AdminDashboardPage from './AdminDashboardPage'

function AdminDashboardRoute() {
  useLayoutEffect(() => {
    const loadingMessage = document.querySelector('.admin-state > p')
    if (loadingMessage?.textContent?.trim() === 'Loading trade operations…') {
      loadingMessage.textContent = 'Loading admin dashboard…'
    }
  })

  return <AdminDashboardPage />
}

export default AdminDashboardRoute
