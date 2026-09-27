import { createClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function firstKey(raw: string | undefined, legacy?: string) {
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      return parsed.default || Object.values(parsed)[0]
    } catch {
      return raw
    }
  }
  return legacy
}

export function getUserClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const publishable = firstKey(
    Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'),
    Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY'),
  ) as string
  return createClient(url, publishable, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const secret = firstKey(
    Deno.env.get('SUPABASE_SECRET_KEYS'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY'),
  ) as string
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function requireUser(req: Request) {
  const client = getUserClient(req)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('UNAUTHORIZED')
  return { user: data.user, client }
}
