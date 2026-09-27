import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase/client'

const DEMO_AUTH_KEY = 'ai-car-cost-tracker-demo-auth-v1'

type AuthContextValue = {
  configured: boolean
  loading: boolean
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [demoAuthenticated, setDemoAuthenticated] = useState(() => localStorage.getItem(DEMO_AUTH_KEY) === '1')

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.error('Failed to restore Supabase session', error)
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    user: session?.user ?? null,
    session,
    isAuthenticated: isSupabaseConfigured ? Boolean(session?.user) : demoAuthenticated,
    signIn: async (email, password) => {
      if (!supabase) {
        if (!email || password.length < 4) throw new Error('Проверьте email и пароль.')
        localStorage.setItem(DEMO_AUTH_KEY, '1')
        setDemoAuthenticated(true)
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },
    signUp: async (email, password, name) => {
      if (!supabase) {
        if (!email || password.length < 6 || !name.trim()) throw new Error('Заполните все поля корректно.')
        localStorage.setItem(DEMO_AUTH_KEY, '1')
        setDemoAuthenticated(true)
        return { needsEmailConfirmation: false }
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) throw new Error(error.message)
      return { needsEmailConfirmation: !data.session }
    },
    signOut: async () => {
      if (!supabase) {
        localStorage.removeItem(DEMO_AUTH_KEY)
        setDemoAuthenticated(false)
        return
      }
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(error.message)
    },
    resetPassword: async (email) => {
      if (!supabase) return
      const redirectTo = `${window.location.origin}${window.location.pathname}#/login`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw new Error(error.message)
    },
  }), [demoAuthenticated, loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
