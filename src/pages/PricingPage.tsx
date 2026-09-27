import { Check, CreditCard, Loader2, LockKeyhole, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../data/store'
import { startProCheckout } from '../lib/billing/client'

export function PricingPage() {
  const { plan, setPlan, backendMode, subscriptionStatus, refreshRemoteData } = useStore()
  const realMode = backendMode === 'supabase'
  const location = useLocation()
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingMessage, setBillingMessage] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('checkout') === 'success') {
      setBillingMessage('Оплата завершена. Обновляем статус подписки…')
      void refreshRemoteData()
    } else if (params.get('checkout') === 'cancelled') {
      setBillingMessage('Оплата отменена. Тариф не изменён.')
    }
  }, [location.search, refreshRemoteData])

  const upgrade = async () => {
    if (!realMode) { setPlan('PRO'); return }
    setBillingLoading(true)
    setBillingMessage(null)
    try {
      await startProCheckout()
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setBillingMessage(code === 'BILLING_NOT_CONFIGURED'
        ? 'Stripe пока не настроен владельцем сервиса. Архитектура оплаты уже подготовлена.'
        : 'Не удалось открыть страницу оплаты. Попробуйте ещё раз.')
      setBillingLoading(false)
    }
  }

  return <div className="page-stack pricing-page">
    <section className="page-heading centered"><span className="eyebrow">Тарифы</span><h1>Выберите подходящий план</h1><p>Начните бесплатно и подключите AI Pro, когда понадобится больше аналитики.</p></section>
    {billingMessage && <div className="billing-message"><CreditCard size={17}/><span>{billingMessage}</span></div>}
    <section className="pricing-grid">
      <PlanCard title="Free" price="€0" subtitle="Для базового учета" active={plan === 'FREE'} features={['1 автомобиль','Учёт расходов','Базовая аналитика','Калькулятор','5 ИИ-запросов в месяц']} action={plan === 'FREE' ? 'Текущий тариф' : realMode ? 'Free после отмены Pro' : 'Перейти на Free'} onClick={() => setPlan('FREE')} disabled={realMode || plan === 'FREE'}/>
      <PlanCard title="AI Pro" price="€9.99" subtitle="в месяц" featured active={plan === 'PRO'} features={['До 100 ИИ-анализов в месяц','Несколько автомобилей','Расширенная аналитика','Прогнозирование','What-if симулятор','Полная история расходов']} action={plan === 'PRO' ? 'Текущий тариф' : billingLoading ? 'Открываем оплату…' : realMode ? 'Перейти на AI Pro' : 'Попробовать AI Pro'} onClick={() => void upgrade()} disabled={plan === 'PRO' || billingLoading} loading={billingLoading}/>
    </section>
    <div className="demo-note">{realMode ? <LockKeyhole size={18}/> : <Sparkles size={18}/>}<span>{realMode ? `Подписка хранится на сервере. Статус: ${subscriptionStatus || 'active'}. Оплата идёт через Stripe Checkout, а изменения тарифа принимаются только через webhook.` : 'Сейчас переключение тарифа работает в демо-режиме. В Supabase-режиме тариф контролируется сервером.'}</span></div>
  </div>
}

function PlanCard({ title, price, subtitle, features, action, onClick, featured, active, disabled, loading }: { title: string; price: string; subtitle: string; features: string[]; action: string; onClick: () => void; featured?: boolean; active?: boolean; disabled?: boolean; loading?: boolean }) {
  return <article className={`pricing-card ${featured ? 'featured' : ''}`}><div><div className="pricing-title"><h2>{title}</h2>{featured && <span>Популярный</span>}</div><div className="price">{price}<small>{subtitle}</small></div></div><div className="feature-list">{features.map((f) => <div key={f}><Check size={17}/><span>{f}</span></div>)}</div><button className={`button full ${featured ? 'primary' : 'secondary'}`} disabled={active || disabled} onClick={onClick}>{loading && <Loader2 size={16} className="spin"/>}{action}</button></article>
}
