import type { Expense } from '../types'

export const sumExpenses = (expenses: Expense[]) => expenses.reduce((sum, item) => sum + item.amount, 0)

export function expensesForMonth(expenses: Expense[], date = new Date()) {
  return expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
  })
}

export function expensesForYear(expenses: Expense[], year = new Date().getFullYear()) {
  return expenses.filter((e) => new Date(e.date).getFullYear() === year)
}

export function monthlySeries(expenses: Expense[], count = 6) {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short' })
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (count - 1 - i))
    const value = sumExpenses(expensesForMonth(expenses, d))
    return { month: formatter.format(d).replace('.', ''), value }
  })
}

export function categoryTotals(expenses: Expense[]) {
  const map = new Map<string, number>()
  for (const item of expenses) map.set(item.category, (map.get(item.category) || 0) + item.amount)
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function costPerKm(total: number, distance: number) {
  return distance > 0 ? total / distance : 0
}

export function yearlyProjection(expenses: Expense[]) {
  const series = monthlySeries(expenses, 6)
  const nonZero = series.filter((m) => m.value > 0)
  if (!nonZero.length) return 0
  return (nonZero.reduce((s, m) => s + m.value, 0) / nonZero.length) * 12
}

export function monthComparison(expenses: Expense[]) {
  const current = sumExpenses(expensesForMonth(expenses))
  const previousDate = new Date()
  previousDate.setMonth(previousDate.getMonth() - 1)
  const previous = sumExpenses(expensesForMonth(expenses, previousDate))
  const percent = previous > 0 ? ((current - previous) / previous) * 100 : 0
  return { current, previous, percent }
}

export function calculator(input: {
  monthlyDistance: number
  fuelConsumption: number
  fuelPrice: number
  insuranceAnnual: number
  maintenanceAnnual: number
  parkingMonthly: number
  taxAnnual: number
  loanMonthly: number
  otherMonthly: number
}) {
  const fuelMonthly = (input.monthlyDistance / 100) * input.fuelConsumption * input.fuelPrice
  const fixedMonthly = input.insuranceAnnual / 12 + input.maintenanceAnnual / 12 + input.taxAnnual / 12 + input.parkingMonthly + input.loanMonthly + input.otherMonthly
  const monthly = fuelMonthly + fixedMonthly
  return {
    fuelMonthly,
    monthly,
    annual: monthly * 12,
    costPerKm: input.monthlyDistance > 0 ? monthly / input.monthlyDistance : 0,
  }
}
