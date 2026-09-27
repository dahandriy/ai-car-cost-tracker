import { corsHeaders, json, getAdminClient, requireUser } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  try {
    const { user } = await requireUser(req)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const priceId = Deno.env.get('STRIPE_PRO_PRICE_ID')
    if (!stripeKey || !priceId) return json({ error: 'BILLING_NOT_CONFIGURED' }, 503)

    const origin = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) return json({ error: 'APP_URL_NOT_CONFIGURED' }, 503)

    const admin = getAdminClient()
    const { data: subscription, error: subError } = await admin.from('subscriptions').select('*').eq('user_id', user.id).single()
    if (subError) throw subError

    let customerId = subscription.stripe_customer_id as string | null
    if (!customerId) {
      const customerBody = new URLSearchParams()
      if (user.email) customerBody.set('email', user.email)
      customerBody.set('metadata[user_id]', user.id)
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: customerBody,
      })
      if (!customerResponse.ok) throw new Error('STRIPE_CUSTOMER_ERROR')
      const customer = await customerResponse.json()
      customerId = customer.id
      await admin.from('subscriptions').update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    }

    const params = new URLSearchParams()
    params.set('mode', 'subscription')
    params.set('customer', customerId!)
    params.set('line_items[0][price]', priceId)
    params.set('line_items[0][quantity]', '1')
    params.set('success_url', `${origin}/#/app/pricing?checkout=success`)
    params.set('cancel_url', `${origin}/#/app/pricing?checkout=cancelled`)
    params.set('client_reference_id', user.id)
    params.set('subscription_data[metadata][user_id]', user.id)
    params.set('allow_promotion_codes', 'true')

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    if (!response.ok) {
      console.error('Stripe checkout error', response.status, (await response.text()).slice(0, 500))
      return json({ error: 'STRIPE_CHECKOUT_ERROR' }, 502)
    }
    const session = await response.json()
    return json({ url: session.url })
  } catch (error) {
    console.error(error)
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return json({ error: 'UNAUTHORIZED' }, 401)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
