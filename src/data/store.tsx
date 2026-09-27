import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialState } from './demo'
import type { AppSettings, AppState, Expense, Plan, Vehicle } from '../types'
import { useAuth } from '../auth/AuthProvider'
import { isSupabaseConfigured } from '../lib/supabase/client'
import {
  createExpense as createExpenseRemote,
  createVehicle as createVehicleRemote,
  deleteExpenseRemote,
  deleteVehicleRemote,
  loadRemoteState,
  saveBudget,
  saveProfile,
  updateExpenseRemote,
  updateVehicleRemote,
} from '../lib/supabase/repositories'

const STORAGE_KEY = 'ai-car-cost-tracker-state-v2'
const THEME_KEY = 'ai-car-theme'

const emptyRemoteState: AppState = {
  vehicles: [],
  expenses: [],
  selectedVehicleId: '',
  monthlyBudget: 0,
  plan: 'FREE',
  aiUsed: 0,
  aiLimit: 5,
  subscriptionStatus: 'active',
  settings: {
    name: 'Пользователь',
    currency: 'EUR',
    distanceUnit: 'км',
    fuelUnit: 'л/100 км',
    theme: (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null) || 'light',
  },
  isAuthenticated: false,
}

type StoreContextValue = AppState & {
  selectedVehicle?: Vehicle
  backendMode: 'supabase' | 'demo'
  dataLoading: boolean
  dataError: string | null
  clearDataError: () => void
  setSelectedVehicleId: (id: string) => void
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Vehicle
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void
  deleteVehicle: (id: string) => void
  addExpense: (expense: Omit<Expense, 'id'>) => Expense
  updateExpense: (id: string, patch: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  setBudget: (value: number) => void
  setPlan: (plan: Plan) => void
  incrementAiUsage: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  resetDemo: () => void
  refreshRemoteData: () => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)

function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState, ...JSON.parse(raw) }
  } catch {
    // Ignore malformed local data and fall back to demo state.
  }
  return initialState
}

function humanizeError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  if (raw.includes('FREE_PLAN_VEHICLE_LIMIT')) return 'На бесплатном тарифе доступен только один автомобиль.'
  if (raw.toLowerCase().includes('jwt')) return 'Сессия истекла. Войдите в аккаунт снова.'
  return 'Не удалось сохранить данные. Проверьте подключение и попробуйте ещё раз.'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [state, setState] = useState<AppState>(() => (isSupabaseConfigured ? emptyRemoteState : loadLocalState()))
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  const refreshRemoteData = async () => {
    if (!isSupabaseConfigured || !auth.user) return
    setDataLoading(true)
    setDataError(null)
    try {
      const remote = await loadRemoteState(auth.user.id)
      setState((s) => ({
        ...s,
        ...remote,
        selectedVehicleId: remote.vehicles.some((v) => v.id === s.selectedVehicleId)
          ? s.selectedVehicleId
          : remote.vehicles[0]?.id ?? '',
        isAuthenticated: true,
      }))
    } catch (error) {
      console.error(error)
      setDataError(humanizeError(error))
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      if (auth.user) void refreshRemoteData()
      else setState((s) => ({ ...emptyRemoteState, settings: { ...emptyRemoteState.settings, theme: s.settings.theme } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    localStorage.setItem(THEME_KEY, state.settings.theme)
    if (!isSupabaseConfigured) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    setState((s) => ({ ...s, isAuthenticated: auth.isAuthenticated }))
  }, [auth.isAuthenticated])

  const persistFailure = (error: unknown) => {
    console.error(error)
    setDataError(humanizeError(error))
    if (isSupabaseConfigured) void refreshRemoteData()
  }

  const value = useMemo<StoreContextValue>(() => {
    const selectedVehicle = state.vehicles.find((v) => v.id === state.selectedVehicleId) ?? state.vehicles[0]
    const userId = auth.user?.id

    return {
      ...state,
      selectedVehicle,
      backendMode: isSupabaseConfigured ? 'supabase' : 'demo',
      dataLoading,
      dataError,
      clearDataError: () => setDataError(null),
      refreshRemoteData,
      setSelectedVehicleId: (id) => setState((s) => ({ ...s, selectedVehicleId: id })),
      addVehicle: (vehicle) => {
        const created = { ...vehicle, id: crypto.randomUUID() }
        setState((s) => ({ ...s, vehicles: [...s.vehicles, created], selectedVehicleId: created.id }))
        if (isSupabaseConfigured && userId) void createVehicleRemote(userId, created).catch(persistFailure)
        return created
      },
      updateVehicle: (id, patch) => {
        setState((s) => ({ ...s, vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) }))
        if (isSupabaseConfigured && userId) void updateVehicleRemote(id, patch).catch(persistFailure)
      },
      deleteVehicle: (id) => {
        setState((s) => {
          const vehicles = s.vehicles.filter((v) => v.id !== id)
          const expenses = s.expenses.filter((e) => e.vehicleId !== id)
          return { ...s, vehicles, expenses, selectedVehicleId: vehicles[0]?.id ?? '' }
        })
        if (isSupabaseConfigured && userId) void deleteVehicleRemote(id).catch(persistFailure)
      },
      addExpense: (expense) => {
        const created = { ...expense, id: crypto.randomUUID() }
        setState((s) => ({ ...s, expenses: [created, ...s.expenses] }))
        if (isSupabaseConfigured && userId) void createExpenseRemote(userId, created).catch(persistFailure)
        return created
      },
      updateExpense: (id, patch) => {
        setState((s) => ({ ...s, expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
        if (isSupabaseConfigured && userId) void updateExpenseRemote(userId, id, patch).catch(persistFailure)
      },
      deleteExpense: (id) => {
        setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }))
        if (isSupabaseConfigured && userId) void deleteExpenseRemote(id).catch(persistFailure)
      },
      setBudget: (value) => {
        const normalized = Math.max(0, value)
        setState((s) => ({ ...s, monthlyBudget: normalized }))
        if (isSupabaseConfigured && userId) void saveBudget(userId, normalized).catch(persistFailure)
      },
      setPlan: (plan) => {
        // In real Supabase mode subscription state is server-controlled and will later be changed by Stripe.
        if (isSupabaseConfigured) return
        setState((s) => ({ ...s, plan, aiLimit: plan === 'PRO' ? 100 : 5, aiUsed: plan === 'PRO' ? Math.min(s.aiUsed, 100) : Math.min(s.aiUsed, 5) }))
      },
      incrementAiUsage: () => {
        // Real mode will be enforced atomically by the Phase 3 Edge Function.
        if (!isSupabaseConfigured) setState((s) => ({ ...s, aiUsed: s.aiUsed + 1 }))
      },
      updateSettings: (patch) => {
        setState((s) => {
          const next = { ...s.settings, ...patch }
          if (isSupabaseConfigured && userId) void saveProfile(userId, next).catch(persistFailure)
          return { ...s, settings: next }
        })
      },
      resetDemo: () => {
        if (isSupabaseConfigured) return
        setState(initialState)
      },
    }
  }, [auth.user?.id, dataError, dataLoading, state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used within StoreProvider')
  return value
}
