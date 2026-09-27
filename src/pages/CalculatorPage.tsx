import { Calculator as CalculatorIcon, Fuel, Gauge, RotateCcw, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calculator } from '../lib/calculations'

const defaults = { monthlyDistance: 1200, fuelConsumption: 7.2, fuelPrice: 1.8, insuranceAnnual: 900, maintenanceAnnual: 900, parkingMonthly: 55, taxAnnual: 216, loanMonthly: 0, otherMonthly: 20 }

export function CalculatorPage() {
  const [data,setData]=useState(defaults)
  const result=useMemo(()=>calculator(data),[data])
  const [simDistance,setSimDistance]=useState(defaults.monthlyDistance)
  const [simPrice,setSimPrice]=useState(defaults.fuelPrice)
  const simulated=calculator({...data,monthlyDistance:simDistance,fuelPrice:simPrice})
  const diff=simulated.monthly-result.monthly

  const field=(key:keyof typeof data,label:string,step='1')=><label>{label}<input type="number" min="0" step={step} value={data[key]} onChange={e=>setData({...data,[key]:+e.target.value})}/></label>

  return <div className="page-stack">
    <section className="page-heading split-heading"><div><span className="eyebrow">Планирование</span><h1>Калькулятор стоимости</h1><p>Рассчитайте реальную ежемесячную стоимость автомобиля.</p></div><button className="button secondary" onClick={()=>setData(defaults)}><RotateCcw size={17}/>Сбросить</button></section>
    <section className="calculator-layout">
      <article className="card"><div className="card-head"><div><span className="eyebrow">Параметры</span><h2>Введите ваши данные</h2></div></div><div className="form-grid calculator-form">
        {field('monthlyDistance','Пробег в месяц, км')}
        {field('fuelConsumption','Расход топлива, л/100 км','0.1')}
        {field('fuelPrice','Цена топлива, €/л','0.01')}
        {field('insuranceAnnual','Страховка в год, €')}
        {field('maintenanceAnnual','Обслуживание в год, €')}
        {field('parkingMonthly','Парковка в месяц, €')}
        {field('taxAnnual','Налог в год, €')}
        {field('loanMonthly','Кредит / лизинг в месяц, €')}
        {field('otherMonthly','Другие расходы в месяц, €')}
      </div></article>
      <article className="result-panel">
        <div><span className="eyebrow light">Результат</span><h2>€{result.monthly.toFixed(0)} <small>/ месяц</small></h2><p>Оценочная стоимость владения при заданных параметрах.</p></div>
        <div className="result-list"><div><span><Fuel size={17}/>Топливо</span><strong>€{result.fuelMonthly.toFixed(0)}</strong></div><div><span><TrendingUp size={17}/>В год</span><strong>€{result.annual.toFixed(0)}</strong></div><div><span><Gauge size={17}/>1 км</span><strong>€{result.costPerKm.toFixed(2)}</strong></div></div>
      </article>
    </section>
    <section className="card simulator-card"><div className="card-head"><div><span className="eyebrow">What-if</span><h2>Симулятор расходов</h2><p>Посмотрите, как изменение пробега или цены топлива влияет на бюджет.</p></div><CalculatorIcon size={24}/></div>
      <div className="slider-grid"><label>Пробег: <strong>{simDistance} км</strong><input type="range" min="300" max="3500" step="100" value={simDistance} onChange={e=>setSimDistance(+e.target.value)}/></label><label>Цена топлива: <strong>€{simPrice.toFixed(2)}</strong><input type="range" min="1" max="3" step="0.05" value={simPrice} onChange={e=>setSimPrice(+e.target.value)}/></label></div>
      <div className="simulation-results"><div><span>Текущие расходы</span><strong>€{result.monthly.toFixed(0)}</strong></div><div><span>Новые расходы</span><strong>€{simulated.monthly.toFixed(0)}</strong></div><div><span>Разница в месяц</span><strong className={diff>0?'negative':'positive'}>{diff>=0?'+':''}€{diff.toFixed(0)}</strong></div><div><span>Разница за год</span><strong className={diff>0?'negative':'positive'}>{diff>=0?'+':''}€{(diff*12).toFixed(0)}</strong></div></div>
    </section>
  </div>
}
