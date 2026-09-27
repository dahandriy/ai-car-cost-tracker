import Stripe from 'npm:stripe@18'
import { getAdminClient, json } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secretKey || !webhookSecret) return json({ error: 'BILLING_NOT_CONFIGURED' }, 503)

  const signature = req.headers.get('stripe-signature')
  if (!signature) return json({ error: 'MISSING_SIGNATURE' }, 400)

  const rawBody = await req.text()
  const stripe = new Stripe(secretKey)
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Invalid Stripe signature', error)
    return json({ error: 'INVALID_SIGNATURE' }, 400)
  }

  const admin = getAdminClient()

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id || session.metadata?.user_id
      if (userId && session.subscription) {
        const stripeSub = await stripe.subscriptions.retrieve(String(session.subscription))
        await admin.from('subscriptions').update({
          plan: 'PRO',
          status: stripeSub.status,
          ai_limit: 100,
          ai_used: 0,
          stripe_customer_id: String(session.customer || ''),
          stripe_subscription_id: stripeSub.id,
          stripe_price_id: stripeSub.items.data[0]?.price.id ?? null,
          current_period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
          period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
          period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object as Stripe.Subscription
      const active = ['active', 'trialing'].includes(stripeSub.status)
      await admin.from('subscriptions').update({
        plan: active ? 'PRO' : 'FREE',
        status: stripeSub.status,
        ai_limit: active ? 100 : 5,
        ai_used: 0,
        stripe_subscription_id: stripeSub.id,
        stripe_price_id: stripeSub.items.data[0]?.price.id ?? null,
        current_period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
        period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
        period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', stripeSub.id)
    }

    return json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed', error)
    return json({ error: 'WEBHOOK_PROCESSING_ERROR' }, 500)
  }
})
