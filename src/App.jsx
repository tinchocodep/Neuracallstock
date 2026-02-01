import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, Suspense, lazy } from 'react'
import { supabase } from './supabaseClient'
import { Layout } from './components/layout/Layout'
import { CartProvider } from './context/CartContext'
import { Loader2 } from 'lucide-react'

// Lazy Loading Modules
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const Inventory = lazy(() => import('./pages/Inventory').then(module => ({ default: module.Inventory })))
const Costs = lazy(() => import('./pages/Costs').then(module => ({ default: module.Costs })))
const Accounts = lazy(() => import('./pages/Accounts').then(module => ({ default: module.Accounts })))
const Returns = lazy(() => import('./pages/Returns').then(module => ({ default: module.Returns })))
const Analysis = lazy(() => import('./pages/Analysis').then(module => ({ default: module.Analysis })))
const Billing = lazy(() => import('./pages/Billing').then(module => ({ default: module.Billing })))
const CreditNote = lazy(() => import('./pages/CreditNote').then(module => ({ default: module.CreditNote })))
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })))

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Layout>{children}</Layout>
}

// Loading Component
const PageLoader = () => (
  <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-transparent">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      <p className="text-sm text-slate-500 font-mono animate-pulse">Cargando módulo...</p>
    </div>
  </div>
)

function App() {
  useEffect(() => {
    // Initialize Theme - Force Dark Mode by default
    const savedTheme = localStorage.getItem('theme')

    // Default to dark if no setting exists, or if setting is 'dark'
    if (!savedTheme || savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <CartProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="/costs" element={
              <ProtectedRoute>
                <Costs />
              </ProtectedRoute>
            } />
            <Route path="/accounts" element={
              <ProtectedRoute>
                <Accounts />
              </ProtectedRoute>
            } />
            <Route path="/returns" element={
              <ProtectedRoute>
                <Returns />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            } />
            <Route path="/credit-note" element={
              <ProtectedRoute>
                <CreditNote />
              </ProtectedRoute>
            } />

            <Route path="*" element={<div className="text-center py-20 text-secondary">Página en construcción</div>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App

