import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { PlantList } from './pages/PlantList'
import { PlantDetail } from './pages/PlantDetail'
import { PlantForm } from './pages/PlantForm'
import { Tasks } from './pages/Tasks'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe, type AuthUser } from './lib/auth-api'

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const me = await getMe()
        if (active) setUser(me)
      } catch {
        if (active) setUser(null)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-600 text-sm">
        正在加载用户信息…
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="plants" element={<PlantList />} />
          <Route path="plants/new" element={<PlantForm />} />
          <Route path="plants/:id" element={<PlantDetail />} />
          <Route path="plants/:id/edit" element={<PlantForm />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
