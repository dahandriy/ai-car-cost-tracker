export type FuelType = 'Бензин' | 'Дизель' | 'Гибрид' | 'Plug-in гибрид' | 'Электромобиль' | 'LPG'
export type Transmission = 'Автомат' | 'Механика'
export type ExpenseCategory =
  | 'Топливо'
  | 'Страховка'
  | 'Парковка'
  | 'Обслуживание'
  | 'Ремонт'
  | 'Мойка'
  | 'Налог'
  | 'Шины'
  | 'Кредит / лизинг'
  | 'Платные дороги'
  | 'Запчасти'
  | 'Прочее'

export interface Vehicle {
  id: string
  brand: string
  model: string
  year: number
  fuelType: FuelType
  transmission: Transmission
  currentMileage: number
  fuelConsumption: number
  monthlyDistance: number
}

export interface Expense {
  id: string
  vehicleId: string
  category: ExpenseCategory
  amount: number
  date: string
  mileage?: number
  description?: string
  liters?: number
  pricePerLiter?: number
  fullTank?: boolean
}

export type Plan = 'FREE' | 'PRO'

export interface AppSettings {
  name: string
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF' | 'PLN'
  distanceUnit: 'км' | 'мили'
  fuelUnit: 'л/100 км' | 'MPG'
  theme: 'light' | 'dark'
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'free' | string

export interface AppState {
  vehicles: Vehicle[]
  expenses: Expense[]
  selectedVehicleId: string
  monthlyBudget: number
  plan: Plan
  aiUsed: number
  aiLimit: number
  subscriptionStatus: SubscriptionStatus
  aiPeriodEnd?: string
  settings: AppSettings
  isAuthenticated: boolean
}
