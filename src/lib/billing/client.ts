import { isSupabaseConfigured, supabase } from '../supabase/client'

export async function startProCheckout() {
  if (!isSupabaseConfigured || !supabase) throw new Error('BILLING_DEMO_MODE')
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: {} })
  if (error) {
    const context = (error as any).context
    let payload: any = null
    try { payload = context ? await context.json() : null } catch { /* noop */ }
    if (payload?.error === 'BILLING_NOT_CONFIGURED') throw new Error('BILLING_NOT_CONFIGURED')
    throw new Error('CHECKOUT_FAILED')
  }
  if (!data?.url) throw new Error('CHECKOUT_FAILED')
  window.location.assign(data.url)
}
