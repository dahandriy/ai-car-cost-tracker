import { Database, LogOut, Moon, RotateCcw, Save, Sun } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useStore } from '../data/store'

export function SettingsPage(){
  const navigate=useNavigate()
  const auth=useAuth()
  const {settings,updateSettings,monthlyBudget,setBudget,plan,resetDemo,backendMode}=useStore()
  const [name,setName]=useState(settings.name)
  const [budget,setBudgetDraft]=useState(monthlyBudget)
  const [saving,setSaving]=useState(false)
  const save=async()=>{setSaving(true);updateSettings({name});setBudget(budget);setTimeout(()=>setSaving(false),450)}
  const logout=async()=>{await auth.signOut();navigate('/')}
  return <div className="page-stack"><section className="page-heading"><span className="eyebrow">Профиль</span><h1>Настройки</h1><p>Персонализируйте интерфейс и параметры расчётов.</p></section>
    <section className="settings-grid"><article className="card"><div className="card-head"><div><h2>Основные настройки</h2><p>Профиль и единицы измерения.</p></div></div><div className="form-grid">
      <label>Имя<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Валюта<select value={settings.currency} onChange={e=>updateSettings({currency:e.target.value as typeof settings.currency})}>{['EUR','USD','GBP','CHF','PLN'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Расстояние<select value={settings.distanceUnit} onChange={e=>updateSettings({distanceUnit:e.target.value as typeof settings.distanceUnit})}><option>км</option><option>мили</option></select></label>
      <label>Расход топлива<select value={settings.fuelUnit} onChange={e=>updateSettings({fuelUnit:e.target.value as typeof settings.fuelUnit})}><option>л/100 км</option><option>MPG</option></select></label>
      <label>Бюджет на месяц, €<input type="number" min="0" value={budget} onChange={e=>setBudgetDraft(+e.target.value)}/></label>
      <label>Тема<button type="button" className="theme-toggle" onClick={()=>updateSettings({theme:settings.theme==='dark'?'light':'dark'})}>{settings.theme==='dark'?<><Sun size={17}/>Светлая</>:<><Moon size={17}/>Тёмная</>}</button></label>
      <div className="full-row"><button disabled={saving} className="button primary" onClick={save}><Save size={17}/>{saving?'Сохраняем…':'Сохранить'}</button></div>
    </div></article>
    <article className="card settings-side"><div><span className="eyebrow">Подписка</span><h2>{plan==='PRO'?'AI Pro':'Free'}</h2><p>{plan==='PRO'?'До 100 ИИ-анализов, несколько автомобилей и расширенная аналитика.':'1 автомобиль и 5 ИИ-запросов в месяц.'}</p><button className="button secondary full" onClick={()=>navigate('/app/pricing')}>Управлять тарифом</button></div><div className="backend-status"><Database size={17}/><div><strong>{backendMode==='supabase'?'Supabase подключён':'Локальный демо-режим'}</strong><span>{backendMode==='supabase'?'Данные сохраняются в PostgreSQL с RLS.':'Данные сохраняются только в этом браузере.'}</span></div></div><div className="danger-zone"><h3>{backendMode==='supabase'?'Аккаунт':'Демо-инструменты'}</h3>{backendMode==='demo'&&<button className="button secondary full" onClick={()=>confirm('Сбросить все локальные изменения?')&&resetDemo()}><RotateCcw size={16}/>Сбросить демо-данные</button>}<button className="button ghost full" onClick={logout}><LogOut size={16}/>Выйти</button></div></article></section>
  </div>
}
