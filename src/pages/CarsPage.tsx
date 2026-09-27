import { Car, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { useStore } from '../data/store'
import { expensesForMonth, sumExpenses, costPerKm } from '../lib/calculations'
import type { FuelType, Transmission, Vehicle } from '../types'

const fuelTypes: FuelType[] = ['Бензин','Дизель','Гибрид','Plug-in гибрид','Электромобиль','LPG']
const transmissions: Transmission[] = ['Автомат','Механика']

const blank: Omit<Vehicle,'id'> = {
  brand: '', model: '', year: new Date().getFullYear(), fuelType: 'Бензин', transmission: 'Автомат', currentMileage: 0, fuelConsumption: 7, monthlyDistance: 1000,
}

export function CarsPage() {
  const { vehicles, expenses, addVehicle, updateVehicle, deleteVehicle, plan } = useStore()
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [creating, setCreating] = useState(false)
  const [paywall, setPaywall] = useState(false)

  const openCreate = () => {
    if (plan === 'FREE' && vehicles.length >= 1) return setPaywall(true)
    setCreating(true)
  }

  return <div className="page-stack">
    <section className="page-heading split-heading"><div><span className="eyebrow">Гараж</span><h1>Мои автомобили</h1><p>Все автомобили и их реальная стоимость владения.</p></div><button className="button primary" onClick={openCreate}><Plus size={18}/>Добавить автомобиль</button></section>
    <section className="car-grid">
      {vehicles.map((v) => {
        const month = sumExpenses(expensesForMonth(expenses.filter((e) => e.vehicleId === v.id)))
        const cpk = costPerKm(month, v.monthlyDistance)
        return <article className="car-card" key={v.id}>
          <div className="car-visual"><div className="car-badge"><Car size={26}/></div><span>{v.fuelType}</span></div>
          <div><span className="eyebrow">{v.year}</span><h2>{v.brand} {v.model}</h2><p>{v.transmission} · {v.currentMileage.toLocaleString('ru-RU')} км</p></div>
          <div className="car-metrics"><div><span>В месяц</span><strong>€{month.toFixed(0)}</strong></div><div><span>1 км</span><strong>€{cpk.toFixed(2)}</strong></div></div>
          <div className="card-actions"><button className="button secondary" onClick={() => setEditing(v)}><Pencil size={16}/>Редактировать</button><button className="icon-button danger" onClick={() => confirm('Удалить автомобиль и связанные расходы?') && deleteVehicle(v.id)}><Trash2 size={17}/></button></div>
        </article>
      })}
    </section>

    {creating && <VehicleModal title="Добавить автомобиль" initial={blank} onClose={() => setCreating(false)} onSave={(data) => { addVehicle(data); setCreating(false) }} />}
    {editing && <VehicleModal title="Редактировать автомобиль" initial={editing} onClose={() => setEditing(null)} onSave={(data) => { updateVehicle(editing.id, data); setEditing(null) }} />}
    {paywall && <Modal title="Доступно в AI Pro" onClose={() => setPaywall(false)}><div className="modal-body"><p>На бесплатном тарифе доступен один автомобиль. В AI Pro можно добавить несколько автомобилей.</p><a href="#/app/pricing" className="button primary full">Перейти на AI Pro</a></div></Modal>}
  </div>
}

function VehicleModal({ title, initial, onClose, onSave }: { title: string; initial: Omit<Vehicle,'id'> | Vehicle; onClose:()=>void; onSave:(data:Omit<Vehicle,'id'>)=>void }) {
  const [data, setData] = useState<Omit<Vehicle,'id'>>({ brand: initial.brand, model: initial.model, year: initial.year, fuelType: initial.fuelType, transmission: initial.transmission, currentMileage: initial.currentMileage, fuelConsumption: initial.fuelConsumption, monthlyDistance: initial.monthlyDistance })
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!data.brand.trim() || !data.model.trim()) return; onSave(data) }
  return <Modal title={title} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label>Марка<input required value={data.brand} onChange={(e)=>setData({...data,brand:e.target.value})}/></label>
    <label>Модель<input required value={data.model} onChange={(e)=>setData({...data,model:e.target.value})}/></label>
    <label>Год<input type="number" min="1950" max="2035" value={data.year} onChange={(e)=>setData({...data,year:+e.target.value})}/></label>
    <label>Тип топлива<select value={data.fuelType} onChange={(e)=>setData({...data,fuelType:e.target.value as FuelType})}>{fuelTypes.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Коробка<select value={data.transmission} onChange={(e)=>setData({...data,transmission:e.target.value as Transmission})}>{transmissions.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Текущий пробег<input type="number" min="0" value={data.currentMileage} onChange={(e)=>setData({...data,currentMileage:+e.target.value})}/></label>
    <label>Средний расход<input type="number" step="0.1" min="0" value={data.fuelConsumption} onChange={(e)=>setData({...data,fuelConsumption:+e.target.value})}/></label>
    <label>Пробег в месяц<input type="number" min="0" value={data.monthlyDistance} onChange={(e)=>setData({...data,monthlyDistance:+e.target.value})}/></label>
    <div className="form-actions full-row"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary">Сохранить</button></div>
  </form></Modal>
}
