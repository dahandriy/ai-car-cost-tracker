import { BarChart3, Bot, Calculator, Car, CircleDollarSign, LayoutDashboard, Moon, Plus, ReceiptText, Settings, Sparkles, Sun } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { useStore } from '../data/store'

const nav = [
  { to: '/app', label: 'Главная', icon: LayoutDashboard },
  { to: '/app/cars', label: 'Мои автомобили', icon: Car },
  { to: '/app/expenses', label: 'Расходы', icon: ReceiptText },
  { to: '/app/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/app/calculator', label: 'Калькулятор', icon: Calculator },
  { to: '/app/ai', label: 'ИИ-ассистент', icon: Bot },
]

export function AppShell() {
  const navigate = useNavigate()
  const { vehicles, selectedVehicleId, setSelectedVehicleId, settings, updateSettings, plan, dataLoading, dataError, clearDataError, backendMode } = useStore()
  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <button className="button primary full" onClick={() => navigate('/app/expenses?new=1')}><Plus size={18} />Добавить расход</button>
        <nav className="sidebar-nav">
          {nav.map((item) => <NavLink key={item.to} end={item.to === '/app'} to={item.to}><item.icon size={19} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/app/pricing"><Sparkles size={19} /><span>Тарифы</span><span className="plan-pill">{plan}</span></NavLink>
          <NavLink to="/app/settings"><Settings size={19} /><span>Настройки</span></NavLink>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-logo"><Logo compact /></div>
          <select className="vehicle-select" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.year}</option>)}
          </select>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Переключить тему" onClick={toggleTheme}>{settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="avatar" onClick={() => navigate('/app/settings')}>{settings.name.slice(0, 1).toUpperCase()}</button>
          </div>
        </header>
        <div className="content">{dataError && <div className="sync-banner error"><span>{dataError}</span><button onClick={clearDataError}>Закрыть</button></div>}{dataLoading && <div className="sync-banner"><span>Синхронизируем данные…</span><small>{backendMode === 'supabase' ? 'Supabase' : 'Локально'}</small></div>}<Outlet /></div>
      </main>

      <nav className="mobile-nav">
        <NavLink end to="/app"><LayoutDashboard size={20} /><span>Главная</span></NavLink>
        <NavLink to="/app/expenses"><ReceiptText size={20} /><span>Расходы</span></NavLink>
        <button className="mobile-add" onClick={() => navigate('/app/expenses?new=1')}><Plus size={24} /></button>
        <NavLink to="/app/analytics"><BarChart3 size={20} /><span>Аналитика</span></NavLink>
        <NavLink to="/app/ai"><Bot size={20} /><span>ИИ</span></NavLink>
      </nav>
    </div>
  )
}
