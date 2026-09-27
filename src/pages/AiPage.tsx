import { AlertCircle, Bot, Loader2, Send, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { AiAssistantError, askAiAssistant } from '../lib/ai/client'
import { categoryTotals, expensesForMonth, monthComparison, sumExpenses, yearlyProjection } from '../lib/calculations'

interface Message { role: 'user' | 'assistant'; content: string; note?: string }

export function AiPage() {
  const { selectedVehicle, expenses, plan, aiUsed, aiLimit, aiPeriodEnd, backendMode, incrementAiUsage, refreshRemoteData } = useStore()
  const limit = aiLimit || (plan === 'PRO' ? 100 : 5)
  const remaining = Math.max(limit - aiUsed, 0)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Здравствуйте! Я могу проанализировать расходы на ваш автомобиль и помочь понять, куда уходят деньги.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(remaining <= 0)
  const scoped = useMemo(() => expenses.filter((e) => e.vehicleId === selectedVehicle?.id), [expenses, selectedVehicle])

  const demoAnswer = (q: string) => {
    const current = expensesForMonth(scoped)
    const total = sumExpenses(current)
    const cats = categoryTotals(current)
    const top = cats[0]
    const comp = monthComparison(scoped)
    const projection = yearlyProjection(scoped)
    const lower = q.toLowerCase()
    if (!scoped.length) return 'Пока недостаточно данных для точного анализа.'
    if (lower.includes('вырос') || lower.includes('почему')) return comp.current > comp.previous
      ? `В этом месяце расходы составляют €${comp.current.toFixed(0)}, что на €${(comp.current - comp.previous).toFixed(0)} больше прошлого месяца. Самая крупная категория сейчас — ${top?.name ?? 'нет данных'} (€${top?.value.toFixed(0) ?? 0}).`
      : `Расходы сейчас не выше прошлого месяца: €${comp.current.toFixed(0)} против €${comp.previous.toFixed(0)}.`
    if (lower.includes('больше всего') || lower.includes('трачу')) return top
      ? `Больше всего в этом месяце уходит на категорию «${top.name}» — €${top.value.toFixed(0)}, это ${total > 0 ? ((top.value / total) * 100).toFixed(0) : 0}% текущих расходов.`
      : 'Пока недостаточно данных для точного анализа.'
    if (lower.includes('год')) return `При текущем темпе ориентировочные расходы за год составят около €${projection.toFixed(0)}. Это оценка на основе последних месяцев, а не гарантированный прогноз.`
    if (lower.includes('эконом') || lower.includes('сниз')) return top
      ? `Сначала стоит посмотреть на крупнейшую категорию — «${top.name}». Сейчас она составляет €${top.value.toFixed(0)} за месяц. Сравните её с 3-месячным средним и проверьте, какие траты можно сократить.`
      : 'Пока недостаточно данных для точного анализа.'
    return `По текущим данным расходы за месяц составляют €${total.toFixed(0)}. Я могу помочь разобрать категории, сравнить месяцы или оценить годовой бюджет.`
  }

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || loading || limitReached || remaining <= 0) return
    setError(null)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])

    if (backendMode === 'demo') {
      setMessages((m) => [...m, { role: 'assistant', content: demoAnswer(q), note: 'Демо-режим: ответ рассчитан локально без внешнего ИИ.' }])
      incrementAiUsage()
      return
    }

    setLoading(true)
    try {
      const result = await askAiAssistant(q, selectedVehicle?.id)
      setMessages((m) => [...m, {
        role: 'assistant',
        content: result.answer,
        note: result.provider === 'mock' ? 'Тестовый ответ Edge Function: реальный AI API пока не настроен.' : undefined,
      }])
      await refreshRemoteData()
    } catch (err) {
      if (err instanceof AiAssistantError && err.code === 'AI_LIMIT_REACHED') {
        setLimitReached(true)
        setError('Лимит ИИ-запросов исчерпан.')
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось получить ответ ИИ.')
      }
      await refreshRemoteData()
    } finally {
      setLoading(false)
    }
  }

  const suggestions = ['Почему мои расходы выросли?', 'На что я трачу больше всего?', 'Как снизить расходы?', 'Сколько машина будет стоить мне за год?']
  const displayedRemaining = limitReached ? 0 : remaining

  return <div className="page-stack ai-page">
    <section className="page-heading split-heading">
      <div><span className="eyebrow">Персональный анализ</span><h1>ИИ-ассистент</h1><p>Ответы строятся на данных выбранного автомобиля.</p></div>
      <div className="usage-chip"><Zap size={16}/><span>{plan === 'PRO' ? 'AI Pro' : 'Free'} · осталось {displayedRemaining}</span></div>
    </section>

    <section className="ai-layout">
      <article className="chat-card">
        <div className="chat-scroll">
          {messages.map((m, i) => <div key={i} className={`message ${m.role}`}>
            <div className="message-avatar">{m.role === 'assistant' ? <Bot size={17}/> : 'А'}</div>
            <div><div className="message-bubble">{m.content}</div>{m.note && <div className="message-note">{m.note}</div>}</div>
          </div>)}
          {loading && <div className="message assistant"><div className="message-avatar"><Bot size={17}/></div><div className="message-bubble loading-bubble"><Loader2 size={16} className="spin"/> Анализирую данные…</div></div>}
        </div>

        {error && <div className="ai-error"><AlertCircle size={16}/><span>{error}</span></div>}

        {!limitReached && displayedRemaining > 0 ? <>
          <div className="suggestions">{suggestions.map((s) => <button key={s} onClick={() => void send(s)} disabled={loading}>{s}</button>)}</div>
          <div className="chat-input"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send() }} placeholder="Спросите о расходах на автомобиль…" disabled={loading}/><button onClick={() => void send()} className="send-button" disabled={loading}><Send size={18}/></button></div>
        </> : <div className="paywall-inline"><Sparkles size={22}/><div><strong>Лимит ИИ-запросов исчерпан</strong><p>Перейдите на AI Pro, чтобы продолжить пользоваться ИИ-анализом.</p></div><a href="#/app/pricing" className="button primary">Перейти на AI Pro</a></div>}
      </article>

      <aside className="ai-side card">
        <span className="eyebrow">Контекст</span>
        <h2>{selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Нет автомобиля'}</h2>
        <p>{backendMode === 'supabase' ? 'ИИ получает только агрегированные данные вашего автомобиля через защищённую Edge Function.' : 'Демо-режим работает локально. После подключения Supabase запросы пойдут через защищённую Edge Function.'}</p>
        <div className="usage-meter"><div className="usage-bar"><span style={{ width: `${Math.min(aiUsed / Math.max(limit, 1) * 100, 100)}%` }}/></div><div><span>{aiUsed} использовано</span><strong>{limit} лимит</strong></div></div>
        {aiPeriodEnd && <p className="period-note">Текущий период до {new Date(aiPeriodEnd).toLocaleDateString('ru-RU')}.</p>}
      </aside>
    </section>
  </div>
}
