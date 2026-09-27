import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { AiPage } from './pages/AiPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { CalculatorPage } from './pages/CalculatorPage'
import { CarsPage } from './pages/CarsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { LandingPage } from './pages/LandingPage'
import { PricingPage } from './pages/PricingPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App(){return <Routes>
  <Route path="/" element={<LandingPage/>}/>
  <Route path="/login" element={<LoginPage/>}/>
  <Route path="/register" element={<RegisterPage/>}/>
  <Route path="/app" element={<ProtectedRoute><AppShell/></ProtectedRoute>}>
    <Route index element={<DashboardPage/>}/>
    <Route path="cars" element={<CarsPage/>}/>
    <Route path="expenses" element={<ExpensesPage/>}/>
    <Route path="analytics" element={<AnalyticsPage/>}/>
    <Route path="calculator" element={<CalculatorPage/>}/>
    <Route path="ai" element={<AiPage/>}/>
    <Route path="pricing" element={<PricingPage/>}/>
    <Route path="settings" element={<SettingsPage/>}/>
  </Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}
