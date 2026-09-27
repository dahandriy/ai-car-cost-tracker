import { ArrowLeft, CarFront } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function LoginPage(){return <AuthForm mode="login"/>}
export function RegisterPage(){return <AuthForm mode="register"/>}

function normalizeAuthError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль.'
  if (m.includes('email not confirmed')) return 'Подтвердите email перед входом.'
  if (m.includes('already registered')) return 'Пользователь с таким email уже зарегистрирован.'
  if (m.includes('password')) return 'Пароль должен содержать минимум 6 символов.'
  return message
}

function AuthForm({mode}:{mode:'login'|'register'}){
  const navigate=useNavigate()
  const auth=useAuth()
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  if (!auth.loading && auth.isAuthenticated) return <Navigate to="/app" replace/>

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    setError('')
    setNotice('')
    if(mode==='register'&&!name.trim()) return setError('Введите имя.')
    if(!email) return setError('Введите email.')
    if(password.length<6) return setError('Пароль должен содержать минимум 6 символов.')
    setLoading(true)
    try {
      if(mode==='register') {
        const result = await auth.signUp(email,password,name)
        if (result.needsEmailConfirmation) {
          setNotice('Аккаунт создан. Проверьте почту и подтвердите email, затем войдите.')
          return
        }
      } else {
        await auth.signIn(email,password)
      }
      navigate('/app')
    } catch (err) {
      setError(normalizeAuthError(err instanceof Error ? err.message : 'Не удалось выполнить вход.'))
    } finally {
      setLoading(false)
    }
  }

  return <div className="auth-page"><div className="auth-panel"><Link to="/" className="back-link"><ArrowLeft size={17}/>На главную</Link><div className="auth-brand"><span className="brand-mark"><CarFront size={22}/></span><span>AI Car Cost Tracker</span></div><div className="auth-heading"><h1>{mode==='login'?'С возвращением':'Создайте аккаунт'}</h1><p>{mode==='login'?'Войдите, чтобы продолжить учет расходов.':'Начните отслеживать реальную стоимость автомобиля.'}</p></div><form onSubmit={submit} className="auth-form">{mode==='register'&&<label>Имя<input value={name} onChange={e=>setName(e.target.value)} placeholder="Алекс" required/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required/></label><label>Пароль<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Минимум 6 символов" required/></label>{error&&<div className="form-alert error">{error}</div>}{notice&&<div className="form-alert success">{notice}</div>}<button disabled={loading} className="button primary full large">{loading?'Подождите…':mode==='login'?'Войти':'Зарегистрироваться'}</button></form><p className="auth-switch">{mode==='login'?'Нет аккаунта?':'Уже есть аккаунт?'} <Link to={mode==='login'?'/register':'/login'}>{mode==='login'?'Зарегистрироваться':'Войти'}</Link></p>{!auth.configured&&<div className="demo-warning">Supabase пока не настроен: вход работает в локальном демо-режиме. После добавления VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY автоматически включится реальная авторизация.</div>}</div><div className="auth-art"><div className="auth-quote"><span>€0.34</span><h2>Реальная стоимость каждого километра — без догадок.</h2><p>Топливо, страховка, обслуживание и остальные расходы в одной системе.</p></div></div></div>
}
