import { BarChart3, Fuel, Gauge, TrendingUp, WalletCards } from 'lucide-react'
import { CategoryChart, SpendingChart } from '../components/Charts'
import { StatCard } from '../components/StatCard'
import { useStore } from '../data/store'
import { categoryTotals, costPerKm, expensesForMonth, expensesForYear, monthComparison, monthlySeries, sumExpenses, yearlyProjection } from '../lib/calculations'

export function AnalyticsPage() {
  const { selectedVehicle, expenses } = useStore()
  if (!selectedVehicle) return <div className="empty-state card"><h2>Нет данных для аналитики</h2><p>Сначала добавьте автомобиль.</p></div>

  const scoped = expenses.filter(e => e.vehicleId === selectedVehicle.id)
  const current = expensesForMonth(scoped)
  const monthTotal = sumExpenses(current)
  const yearTotal = sumExpenses(expensesForYear(scoped))
  const cpk = costPerKm(monthTotal, selectedVehicle.monthlyDistance)
  const projection = yearlyProjection(scoped)
  const comparison = monthComparison(scoped)
  const fuelTotal = current.filter(e => e.category === 'Топливо').reduce((s,e)=>s+e.amount,0)
  const fuelPer100 = selectedVehicle.monthlyDistance > 0 ? (fuelTotal / selectedVehicle.monthlyDistance) * 100 : 0
  const series = monthlySeries(scoped, 6)
  const categories = categoryTotals(current)

  return <div className="page-stack">
    <section className="page-heading"><span className="eyebrow">Глубже в данные</span><h1>Аналитика</h1><p>Понимайте, куда уходят деньги и как меняется стоимость владения.</p></section>
    <section className="stats-grid analytics-stats">
      <StatCard label="За месяц" value={`€${monthTotal.toFixed(0)}`} icon={WalletCards} tone="blue" />
      <StatCard label="За год" value={`€${yearTotal.toFixed(0)}`} icon={BarChart3} tone="violet" />
      <StatCard label="Стоимость 1 км" value={`€${cpk.toFixed(2)}`} icon={Gauge} tone="green" />
      <StatCard label="Топливо / 100 км" value={`€${fuelPer100.toFixed(2)}`} icon={Fuel} tone="orange" />
    </section>
    <section className="dashboard-grid">
      <article className="card span-2"><div className="card-head"><div><span className="eyebrow">Тренд</span><h2>Расходы за 6 месяцев</h2></div><div className={comparison.percent > 0 ? 'trend negative' : 'trend positive'}>{comparison.percent > 0 ? '↑' : '↓'} {Math.abs(comparison.percent).toFixed(1)}%</div></div><SpendingChart data={series}/></article>
      <article className="card"><div className="card-head"><div><span className="eyebrow">Категории</span><h2>Структура расходов</h2></div></div><CategoryChart data={categories}/></article>
    </section>
    <section className="insight-grid">
      <article className="card insight-block"><TrendingUp/><div><span>Прогноз на год</span><strong>€{projection.toFixed(0)}</strong><p>Оценка на основе последних месяцев.</p></div></article>
      <article className="card insight-block"><Gauge/><div><span>Пробег в месяц</span><strong>{selectedVehicle.monthlyDistance.toLocaleString('ru-RU')} км</strong><p>Используется для расчёта стоимости 1 км.</p></div></article>
      <article className="card insight-block"><Fuel/><div><span>Средний расход</span><strong>{selectedVehicle.fuelConsumption.toFixed(1)} л/100 км</strong><p>Текущая настройка автомобиля.</p></div></article>
    </section>
  </div>
}
