import type { AppState, Expense, Vehicle } from '../types'

export const demoVehicles: Vehicle[] = [
  {
    id: 'bmw-320i',
    brand: 'BMW',
    model: '320i',
    year: 2021,
    fuelType: 'Бензин',
    transmission: 'Автомат',
    currentMileage: 64300,
    fuelConsumption: 7.2,
    monthlyDistance: 1200,
  },
]

const month = (offset: number, day: number) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - offset)
  d.setDate(day)
  return d.toISOString().slice(0, 10)
}

export const demoExpenses: Expense[] = [
  { id: 'e1', vehicleId: 'bmw-320i', category: 'Топливо', amount: 180, date: month(0, 4), mileage: 64220, description: 'Заправка', liters: 100, pricePerLiter: 1.8, fullTank: true },
  { id: 'e2', vehicleId: 'bmw-320i', category: 'Страховка', amount: 75, date: month(0, 6), description: 'Ежемесячная страховка' },
  { id: 'e3', vehicleId: 'bmw-320i', category: 'Парковка', amount: 55, date: month(0, 10), description: 'Абонемент на парковку' },
  { id: 'e4', vehicleId: 'bmw-320i', category: 'Обслуживание', amount: 80, date: month(0, 14), mileage: 64290, description: 'Замена фильтра' },
  { id: 'e5', vehicleId: 'bmw-320i', category: 'Мойка', amount: 20, date: month(0, 20), description: 'Комплексная мойка' },

  { id: 'e6', vehicleId: 'bmw-320i', category: 'Топливо', amount: 165, date: month(1, 4), description: 'Топливо' },
  { id: 'e7', vehicleId: 'bmw-320i', category: 'Страховка', amount: 75, date: month(1, 7) },
  { id: 'e8', vehicleId: 'bmw-320i', category: 'Парковка', amount: 55, date: month(1, 10) },
  { id: 'e9', vehicleId: 'bmw-320i', category: 'Обслуживание', amount: 50, date: month(1, 18) },
  { id: 'e10', vehicleId: 'bmw-320i', category: 'Мойка', amount: 20, date: month(1, 23) },

  { id: 'e11', vehicleId: 'bmw-320i', category: 'Топливо', amount: 172, date: month(2, 4) },
  { id: 'e12', vehicleId: 'bmw-320i', category: 'Страховка', amount: 75, date: month(2, 7) },
  { id: 'e13', vehicleId: 'bmw-320i', category: 'Парковка', amount: 55, date: month(2, 11) },
  { id: 'e14', vehicleId: 'bmw-320i', category: 'Ремонт', amount: 88, date: month(2, 18) },

  { id: 'e15', vehicleId: 'bmw-320i', category: 'Топливо', amount: 160, date: month(3, 5) },
  { id: 'e16', vehicleId: 'bmw-320i', category: 'Страховка', amount: 75, date: month(3, 7) },
  { id: 'e17', vehicleId: 'bmw-320i', category: 'Парковка', amount: 55, date: month(3, 11) },
  { id: 'e18', vehicleId: 'bmw-320i', category: 'Мойка', amount: 30, date: month(3, 20) },

  { id: 'e19', vehicleId: 'bmw-320i', category: 'Топливо', amount: 184, date: month(4, 5) },
  { id: 'e20', vehicleId: 'bmw-320i', category: 'Страховка', amount: 75, date: month(4, 7) },
  { id: 'e21', vehicleId: 'bmw-320i', category: 'Парковка', amount: 55, date: month(4, 11) },
  { id: 'e22', vehicleId: 'bmw-320i', category: 'Обслуживание', amount: 76, date: month(4, 18) },

  { id: 'e23', vehicleId: 'bmw-320i', category: 'Топливо', amount: 150, date: month(5, 5) },
  { id: 'e24', vehicleId: 'bmw-320i', category: 'Страховка', amount: 75, date: month(5, 7) },
  { id: 'e25', vehicleId: 'bmw-320i', category: 'Парковка', amount: 55, date: month(5, 11) },
  { id: 'e26', vehicleId: 'bmw-320i', category: 'Мойка', amount: 40, date: month(5, 18) },
]

export const initialState: AppState = {
  vehicles: demoVehicles,
  expenses: demoExpenses,
  selectedVehicleId: 'bmw-320i',
  monthlyBudget: 450,
  plan: 'FREE',
  aiUsed: 3,
  aiLimit: 5,
  subscriptionStatus: 'active',
  settings: {
    name: 'Алекс',
    currency: 'EUR',
    distanceUnit: 'км',
    fuelUnit: 'л/100 км',
    theme: 'light',
  },
  isAuthenticated: false,
}
