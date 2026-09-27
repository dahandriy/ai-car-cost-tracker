import { supabase } from './client'
import type { AppSettings, Expense, Plan, Vehicle } from '../../types'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type RemoteAppState = {
  vehicles: Vehicle[]
  expenses: Expense[]
  monthlyBudget: number
  plan: Plan
  aiUsed: number
  aiLimit: number
  subscriptionStatus: string
  aiPeriodEnd?: string
  settings: AppSettings
}

const vehicleFromRow = (row: any): Vehicle => ({
  id: row.id,
  brand: row.brand,
  model: row.model,
  year: row.year,
  fuelType: row.fuel_type,
  transmission: row.transmission,
  currentMileage: Number(row.current_mileage ?? 0),
  fuelConsumption: Number(row.fuel_consumption ?? 0),
  monthlyDistance: Number(row.monthly_distance ?? 0),
})

const expenseFromRow = (row: any): Expense => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  category: row.category,
  amount: Number(row.amount ?? 0),
  date: row.date,
  mileage: row.mileage == null ? undefined : Number(row.mileage),
  description: row.description ?? undefined,
  liters: row.fuel_entries?.[0]?.liters == null ? undefined : Number(row.fuel_entries[0].liters),
  pricePerLiter: row.fuel_entries?.[0]?.price_per_liter == null ? undefined : Number(row.fuel_entries[0].price_per_liter),
  fullTank: row.fuel_entries?.[0]?.full_tank ?? undefined,
})

export async function loadRemoteState(userId: string): Promise<RemoteAppState> {
  const client = requireClient()
  const [profileResult, vehiclesResult, expensesResult, budgetResult, subscriptionResult] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('vehicles').select('*').order('created_at', { ascending: true }),
    client.from('expenses').select('*, fuel_entries(liters, price_per_liter, full_tank)').order('date', { ascending: false }),
    client.from('budgets').select('*').is('vehicle_id', null).maybeSingle(),
    client.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
  ])

  for (const result of [profileResult, vehiclesResult, expensesResult, budgetResult, subscriptionResult]) {
    if (result.error) throw result.error
  }

  const profile = profileResult.data
  const subscription = subscriptionResult.data

  return {
    vehicles: (vehiclesResult.data ?? []).map(vehicleFromRow),
    expenses: (expensesResult.data ?? []).map(expenseFromRow),
    monthlyBudget: Number(budgetResult.data?.monthly_limit ?? 0),
    plan: subscription?.plan === 'PRO' ? 'PRO' : 'FREE',
    aiUsed: Number(subscription?.ai_used ?? 0),
    aiLimit: Number(subscription?.ai_limit ?? (subscription?.plan === 'PRO' ? 100 : 5)),
    subscriptionStatus: subscription?.status || 'active',
    aiPeriodEnd: subscription?.period_end || subscription?.current_period_end || undefined,
    settings: {
      name: profile?.display_name || 'Пользователь',
      currency: profile?.currency || 'EUR',
      distanceUnit: profile?.distance_unit || 'км',
      fuelUnit: profile?.fuel_unit || 'л/100 км',
      theme: (localStorage.getItem('ai-car-theme') as 'light' | 'dark' | null) || 'light',
    },
  }
}

export async function createVehicle(userId: string, vehicle: Vehicle) {
  const client = requireClient()
  const { error } = await client.from('vehicles').insert({
    id: vehicle.id,
    user_id: userId,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    fuel_type: vehicle.fuelType,
    transmission: vehicle.transmission,
    current_mileage: vehicle.currentMileage,
    fuel_consumption: vehicle.fuelConsumption,
    monthly_distance: vehicle.monthlyDistance,
  })
  if (error) throw error
}

export async function updateVehicleRemote(id: string, patch: Partial<Vehicle>) {
  const client = requireClient()
  const row: Record<string, unknown> = {}
  if (patch.brand !== undefined) row.brand = patch.brand
  if (patch.model !== undefined) row.model = patch.model
  if (patch.year !== undefined) row.year = patch.year
  if (patch.fuelType !== undefined) row.fuel_type = patch.fuelType
  if (patch.transmission !== undefined) row.transmission = patch.transmission
  if (patch.currentMileage !== undefined) row.current_mileage = patch.currentMileage
  if (patch.fuelConsumption !== undefined) row.fuel_consumption = patch.fuelConsumption
  if (patch.monthlyDistance !== undefined) row.monthly_distance = patch.monthlyDistance
  const { error } = await client.from('vehicles').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteVehicleRemote(id: string) {
  const client = requireClient()
  const { error } = await client.from('vehicles').delete().eq('id', id)
  if (error) throw error
}

export async function createExpense(userId: string, expense: Expense) {
  const client = requireClient()
  const { error } = await client.from('expenses').insert({
    id: expense.id,
    user_id: userId,
    vehicle_id: expense.vehicleId,
    category: expense.category,
    amount: expense.amount,
    date: expense.date,
    mileage: expense.mileage ?? null,
    description: expense.description ?? null,
    is_recurring: false,
  })
  if (error) throw error

  if (expense.category === 'Топливо' && (expense.liters || expense.pricePerLiter || expense.fullTank !== undefined)) {
    const { error: fuelError } = await client.from('fuel_entries').insert({
      user_id: userId,
      vehicle_id: expense.vehicleId,
      expense_id: expense.id,
      liters: expense.liters ?? null,
      price_per_liter: expense.pricePerLiter ?? null,
      total: expense.amount,
      mileage: expense.mileage ?? null,
      full_tank: expense.fullTank ?? false,
      date: expense.date,
    })
    if (fuelError) throw fuelError
  }
}

export async function updateExpenseRemote(userId: string, id: string, patch: Partial<Expense>) {
  const client = requireClient()
  const row: Record<string, unknown> = {}
  if (patch.vehicleId !== undefined) row.vehicle_id = patch.vehicleId
  if (patch.category !== undefined) row.category = patch.category
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.date !== undefined) row.date = patch.date
  if (patch.mileage !== undefined) row.mileage = patch.mileage ?? null
  if (patch.description !== undefined) row.description = patch.description ?? null
  const { error } = await client.from('expenses').update(row).eq('id', id)
  if (error) throw error

  if (patch.category === 'Топливо') {
    const { error: fuelError } = await client.from('fuel_entries').upsert({
      user_id: userId,
      vehicle_id: patch.vehicleId,
      expense_id: id,
      liters: patch.liters ?? null,
      price_per_liter: patch.pricePerLiter ?? null,
      total: patch.amount,
      mileage: patch.mileage ?? null,
      full_tank: patch.fullTank ?? false,
      date: patch.date,
    }, { onConflict: 'expense_id' })
    if (fuelError) throw fuelError
  } else if (patch.category) {
    const { error: fuelDeleteError } = await client.from('fuel_entries').delete().eq('expense_id', id)
    if (fuelDeleteError) throw fuelDeleteError
  }
}

export async function deleteExpenseRemote(id: string) {
  const client = requireClient()
  const { error } = await client.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function saveProfile(userId: string, settings: AppSettings) {
  const client = requireClient()
  const { error } = await client.from('profiles').upsert({
    id: userId,
    display_name: settings.name,
    currency: settings.currency,
    distance_unit: settings.distanceUnit,
    fuel_unit: settings.fuelUnit,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function saveBudget(userId: string, monthlyLimit: number) {
  const client = requireClient()
  const { data: existing, error: lookupError } = await client.from('budgets').select('id').eq('user_id', userId).is('vehicle_id', null).maybeSingle()
  if (lookupError) throw lookupError
  if (existing) {
    const { error } = await client.from('budgets').update({ monthly_limit: monthlyLimit, updated_at: new Date().toISOString() }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await client.from('budgets').insert({ user_id: userId, vehicle_id: null, monthly_limit: monthlyLimit })
    if (error) throw error
  }
}
