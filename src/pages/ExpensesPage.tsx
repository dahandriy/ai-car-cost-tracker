import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { useStore } from '../data/store'
import type { Expense, ExpenseCategory } from '../types'

const categories: ExpenseCategory[] = ['Топливо','Страховка','Парковка','Обслуживание','Ремонт','Мойка','Налог','Шины','Кредит / лизинг','Платные дороги','Запчасти','Прочее']

export function ExpensesPage() {
  const { expenses, vehicles, selectedVehicleId, addExpense, updateExpense, deleteExpense } = useStore()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Все')
  const [vehicleId, setVehicleId] = useState('Все')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => { if (params.get('new') === '1') { setCreating(true); setParams({}) } }, [params, setParams])

  const filtered = useMemo(() => expenses.filter((e) => {
    const q = `${e.category} ${e.description || ''}`.toLowerCase()
    return q.includes(query.toLowerCase()) && (category === 'Все' || e.category === category) && (vehicleId === 'Все' || e.vehicleId === vehicleId)
  }).sort((a,b)=>b.date.localeCompare(a.date)), [expenses, query, category, vehicleId])

  return <div className="page-stack">
    <section className="page-heading split-heading"><div><span className="eyebrow">История</span><h1>Расходы</h1><p>Все траты на автомобиль в одном месте.</p></div><button className="button primary" onClick={()=>setCreating(true)}><Plus size={18}/>Добавить расход</button></section>
    <section className="card">
      <div className="filters-row">
        <div className="search-field"><Search size={17}/><input placeholder="Поиск расходов" value={query} onChange={(e)=>setQuery(e.target.value)}/></div>
        <select value={category} onChange={(e)=>setCategory(e.target.value)}><option>Все</option>{categories.map(x=><option key={x}>{x}</option>)}</select>
        <select value={vehicleId} onChange={(e)=>setVehicleId(e.target.value)}><option value="Все">Все автомобили</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}</select>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Категория</th><th>Описание</th><th>Автомобиль</th><th>Пробег</th><th>Сумма</th><th></th></tr></thead><tbody>
        {filtered.map((e)=><tr key={e.id}><td>{new Date(e.date).toLocaleDateString('ru-RU')}</td><td><span className="category-pill">{e.category}</span></td><td>{e.description || '—'}</td><td>{vehicles.find(v=>v.id===e.vehicleId)?.brand} {vehicles.find(v=>v.id===e.vehicleId)?.model}</td><td>{e.mileage ? `${e.mileage.toLocaleString('ru-RU')} км` : '—'}</td><td className="amount-cell">€{e.amount.toFixed(2)}</td><td><div className="row-actions"><button className="icon-button" onClick={()=>setEditing(e)}><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>confirm('Удалить расход?') && deleteExpense(e.id)}><Trash2 size={16}/></button></div></td></tr>)}
      </tbody></table>{filtered.length===0 && <div className="empty-table">Расходов по выбранным условиям нет.</div>}</div>
    </section>
    {creating && <ExpenseModal initial={{ vehicleId: selectedVehicleId || vehicles[0]?.id || '', category:'Топливо', amount:0, date:new Date().toISOString().slice(0,10), description:'' }} onClose={()=>setCreating(false)} onSave={(data)=>{addExpense(data);setCreating(false)}} vehicles={vehicles}/>} 
    {editing && <ExpenseModal initial={editing} onClose={()=>setEditing(null)} onSave={(data)=>{updateExpense(editing.id,data);setEditing(null)}} vehicles={vehicles}/>} 
  </div>
}

function ExpenseModal({ initial, onClose, onSave, vehicles }: { initial: Omit<Expense,'id'> | Expense; onClose:()=>void; onSave:(data:Omit<Expense,'id'>)=>void; vehicles:{id:string;brand:string;model:string}[] }) {
  const [data,setData]=useState<Omit<Expense,'id'>>({vehicleId:initial.vehicleId,category:initial.category,amount:initial.amount,date:initial.date,mileage:initial.mileage,description:initial.description,liters:initial.liters,pricePerLiter:initial.pricePerLiter,fullTank:initial.fullTank})
  const submit=(e:React.FormEvent)=>{e.preventDefault(); if(!data.vehicleId || data.amount<=0) return; onSave(data)}
  return <Modal title={('id' in initial)?'Редактировать расход':'Добавить расход'} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label>Автомобиль<select value={data.vehicleId} onChange={e=>setData({...data,vehicleId:e.target.value})}>{vehicles.map(v=><option value={v.id} key={v.id}>{v.brand} {v.model}</option>)}</select></label>
    <label>Категория<select value={data.category} onChange={e=>setData({...data,category:e.target.value as ExpenseCategory})}>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Дата<input type="date" value={data.date} onChange={e=>setData({...data,date:e.target.value})}/></label>
    <label>Сумма, €<input type="number" min="0" step="0.01" value={data.amount} onChange={e=>setData({...data,amount:+e.target.value})}/></label>
    <label>Пробег<input type="number" min="0" value={data.mileage ?? ''} onChange={e=>setData({...data,mileage:e.target.value?+e.target.value:undefined})}/></label>
    <label>Описание<input value={data.description ?? ''} onChange={e=>setData({...data,description:e.target.value})} placeholder="Например, замена масла"/></label>
    {data.category==='Топливо' && <><label>Литры<input type="number" min="0" step="0.01" value={data.liters ?? ''} onChange={e=>setData({...data,liters:e.target.value?+e.target.value:undefined})}/></label><label>Цена за литр<input type="number" min="0" step="0.01" value={data.pricePerLiter ?? ''} onChange={e=>setData({...data,pricePerLiter:e.target.value?+e.target.value:undefined})}/></label><label className="checkbox-label"><input type="checkbox" checked={!!data.fullTank} onChange={e=>setData({...data,fullTank:e.target.checked})}/>Полный бак</label></>}
    <div className="form-actions full-row"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary">Сохранить</button></div>
  </form></Modal>
}
