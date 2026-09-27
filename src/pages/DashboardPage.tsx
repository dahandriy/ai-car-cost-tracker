import { ArrowDownRight, ArrowUpRight, Bot, Car, Fuel, Gauge, Plus, ReceiptText, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CategoryChart, SpendingChart } from '../components/Charts'
import { StatCard } from '../components/StatCard'
import { useStore } from '../data/store'
import { categoryTotals, costPerKm, expensesForMonth, expensesForYear, monthComparison, monthlySeries, sumExpenses, yearlyProjection } from '../lib/calculations'

export function DashboardPage() {
  const navigate = useNavigate()
  const { selectedVehicle, expenses, monthlyBudget, settings } = useStore()
  if (!selectedVehicle) return <EmptyCars />

  const vehicleExpenses = expenses.filter((e) => e.vehicleId === selectedVehicle.id)
  const currentExpenses = expensesForMonth(vehicleExpenses)
  const monthTotal = sumExpenses(currentExpenses)
  const yearTotal = sumExpenses(expensesForYear(vehicleExpenses))
  const comparison = monthComparison(vehicleExpenses)
  const series = monthlySeries(vehicleExpenses)
  const categories = categoryTotals(currentExpenses)
  const fuel = currentExpenses.filter((e) => e.category === 'Топливо').reduce((s, e) => s + e.amount, 0)
  const average = series.reduce((s, m) => s + m.value, 0) / Math.max(series.filter((m) => m.value > 0).length, 1)
  const cpk = costPerKm(monthTotal, selectedVehicle.monthlyDistance)
  const budgetPercent = monthlyBudget > 0 ? Math.min((monthTotal / monthlyBudget) * 100, 100) : 0
  const projected = yearlyProjection(vehicleExpenses)

  return <div className="page-stack">
    <section className="page-heading split-heading">
      <div><span className="eyebrow">Обзор расходов</span><h1>С возвращением, {settings.name}</h1><p>{selectedVehicle.brand} {selectedVehicle.model} · {selectedVehicle.year} · {selectedVehicle.fuelType}</p></div>
      <button className="button primary" onClick={() => navigate('/app/expenses?new=1')}><Plus size={18}/>Добавить расход</button>
    </section>

    <section className="stats-grid">
      <StatCard label="Расходы за месяц" value={`€${monthTotal.toFixed(0)}`} hint={`${comparison.percent >= 0 ? '+' : ''}${comparison.percent.toFixed(1)}% к прошлому месяцу`} icon={WalletCards} tone="blue" />
      <StatCard label="Расходы за год" value={`€${yearTotal.toFixed(0)}`} hint={`Прогноз €${projected.toFixed(0)}`} icon={ReceiptText} tone="violet" />
      <StatCard label="Стоимость 1 км" value={`€${cpk.toFixed(2)}`} hint={`${selectedVehicle.monthlyDistance.toLocaleString('ru-RU')} км в месяц`} icon={Gauge} tone="green" />
      <StatCard label="Расходы на топливо" value={`€${fuel.toFixed(0)}`} hint={`${selectedVehicle.fuelConsumption.toFixed(1)} л / 100 км`} icon={Fuel} tone="orange" />
    </section>

    <section className="dashboard-grid">
      <article className="card span-2">
        <div className="card-head"><div><span className="eyebrow">Динамика</span><h2>Расходы по месяцам</h2></div><span className="soft-pill">6 месяцев</span></div>
        <SpendingChart data={series} />
      </article>
      <article className="card">
        <div className="card-head"><div><span className="eyebrow">Структура</span><h2>По категориям</h2></div></div>
        <CategoryChart data={categories} />
      </article>
    </section>

    <section className="dashboard-grid lower-grid">
      <article className="card">
        <div className="card-head"><div><span className="eyebrow">Лимит</span><h2>Бюджет на месяц</h2></div><strong>€{monthTotal.toFixed(0)} / €{monthlyBudget}</strong></div>
        <div className="budget-track"><span style={{ width: `${budgetPercent}%` }} /></div>
        <div className="budget-meta"><span>Использовано {budgetPercent.toFixed(0)}%</span><span>Осталось €{Math.max(monthlyBudget - monthTotal, 0).toFixed(0)}</span></div>
      </article>

      <article className="card ai-card">
        <div className="ai-card-icon"><Bot size={22}/></div>
        <div><span className="eyebrow">ИИ-инсайт</span><h2>Что изменилось?</h2><p>{comparison.current > comparison.previous ? `В этом месяце расходы выше на €${(comparison.current - comparison.previous).toFixed(0)}. Основной рост связан с текущими категориями расходов.` : 'Расходы в этом месяце ниже или на уровне прошлого месяца.'}</p><button className="text-button" onClick={() => navigate('/app/ai')}>Спросить ИИ →</button></div>
      </article>

      <article className="card recent-card">
        <div className="card-head"><div><span className="eyebrow">Последние операции</span><h2>Недавние расходы</h2></div><button className="text-button" onClick={() => navigate('/app/expenses')}>Все расходы</button></div>
        <div className="expense-mini-list">
          {currentExpenses.slice(0,4).map((e) => <div className="expense-mini" key={e.id}><span className="mini-icon">{e.category === 'Топливо' ? <Fuel size={17}/> : <ReceiptText size={17}/>}</span><div><strong>{e.category}</strong><span>{e.description || new Date(e.date).toLocaleDateString('ru-RU')}</span></div><strong className="amount">-€{e.amount.toFixed(0)}</strong></div>)}
        </div>
      </article>
    </section>
  </div>
}

function EmptyCars() {
  const navigate = useNavigate()
  return <div className="empty-state card"><Car size={36}/><h2>Добавьте первый автомобиль</h2><p>После этого здесь появятся расходы, стоимость 1 км и аналитика.</p><button className="button primary" onClick={() => navigate('/app/cars')}>Добавить автомобиль</button></div>
}
