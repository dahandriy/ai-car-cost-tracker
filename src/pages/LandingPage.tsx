import { ArrowRight, BarChart3, Bot, Calculator, CheckCircle2, Gauge, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function LandingPage(){
  const [open,setOpen]=useState(false)
  return <div className="landing">
    <header className="landing-header"><Logo/><nav className={open?'open':''}><a href="#features">Возможности</a><Link to="/app/calculator">Калькулятор</Link><a href="#ai">ИИ-ассистент</a><Link to="/app/pricing">Тарифы</Link><Link to="/login" className="nav-login">Войти</Link><Link to="/register" className="button primary">Начать бесплатно</Link></nav><button className="mobile-menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>

    <main>
      <section className="hero"><div className="hero-copy"><span className="hero-chip"><Sparkles size={15}/>Умный контроль расходов на автомобиль</span><h1>Узнайте, сколько на самом деле стоит ваш автомобиль</h1><p>Учитывайте топливо, страховку, обслуживание и другие расходы в одном месте. Смотрите стоимость 1 км и получайте понятную аналитику с помощью ИИ.</p><div className="hero-actions"><Link to="/register" className="button primary large">Начать бесплатно <ArrowRight size={18}/></Link><Link to="/app/calculator" className="button secondary large">Рассчитать стоимость</Link></div><div className="trust-row"><span><CheckCircle2 size={16}/>Без банковской карты</span><span><CheckCircle2 size={16}/>Русский интерфейс</span></div></div><DashboardPreview/></section>

      <section id="features" className="landing-section"><div className="section-heading"><span className="eyebrow">Всё в одном месте</span><h2>Не только топливо. Полная стоимость владения.</h2><p>Сервис собирает повседневные траты и превращает их в понятные показатели.</p></div><div className="feature-grid">
        <Feature icon={Gauge} title="Стоимость 1 км" text="Понимайте реальную цену каждой поездки с учетом всех расходов."/>
        <Feature icon={BarChart3} title="Аналитика расходов" text="Следите за динамикой, категориями и изменениями от месяца к месяцу."/>
        <Feature icon={Calculator} title="Симулятор" text="Проверьте, как изменятся расходы при росте пробега или цены топлива."/>
        <Feature icon={Bot} title="ИИ-анализ" text="Получайте ответы по вашим данным, а не общие советы из интернета."/>
      </div></section>

      <section id="ai" className="landing-section ai-showcase"><div><span className="eyebrow">ИИ-ассистент</span><h2>Спросите: «Почему расходы выросли?»</h2><p>Ассистент анализирует категории, пробег и историю трат и объясняет изменения простым языком.</p><ul className="clean-list"><li><ShieldCheck size={18}/>Не придумывает цифры, которых нет в данных</li><li><ShieldCheck size={18}/>Разделяет факты и прогнозы</li><li><ShieldCheck size={18}/>Отвечает на русском языке</li></ul></div><div className="landing-chat"><div className="chat-q">Почему мои расходы выросли?</div><div className="chat-a"><Bot size={19}/><p>В этом месяце расходы выше на €45. Основной рост связан с топливом и обслуживанием. Вы также проехали больше, чем в прошлом месяце.</p></div></div></section>

      <section className="cta-section"><div><span className="eyebrow light">Начните с реальных цифр</span><h2>Контролируйте автомобильный бюджет без таблиц и хаоса</h2></div><Link className="button white large" to="/register">Создать аккаунт <ArrowRight size={18}/></Link></section>
    </main>
    <footer className="landing-footer"><Logo/><span>© 2026 AI Car Cost Tracker</span></footer>
  </div>
}

function Feature({icon:Icon,title,text}:{icon:typeof Gauge;title:string;text:string}){return <article className="feature-card"><div className="feature-icon"><Icon size={22}/></div><h3>{title}</h3><p>{text}</p></article>}

function DashboardPreview(){return <div className="preview-shell"><div className="preview-top"><span></span><span></span><span></span></div><div className="preview-body"><div className="preview-sidebar"><div></div><div></div><div></div><div></div></div><div className="preview-main"><div className="preview-title"></div><div className="preview-stats"><div><small>За месяц</small><strong>€410</strong></div><div><small>1 км</small><strong>€0.34</strong></div><div><small>Топливо</small><strong>€180</strong></div></div><div className="preview-chart"><svg viewBox="0 0 500 180" preserveAspectRatio="none"><path d="M0 145 C70 120 85 135 145 90 S250 112 300 70 S400 85 500 30" fill="none" stroke="#0d65f6" strokeWidth="6" strokeLinecap="round"/></svg></div><div className="preview-bottom"><div></div><div></div></div></div></div></div>}
