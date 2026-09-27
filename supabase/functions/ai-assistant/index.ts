import { corsHeaders, json, requireUser } from '../_shared/utils.ts'

type AiPayload = { question?: string; vehicleId?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  let client: any = null
  let quotaClaimed = false
  try {
    const auth = await requireUser(req)
    client = auth.client
    const body = (await req.json()) as AiPayload
    const question = body.question?.trim()
    if (!question || question.length > 1200) return json({ error: 'INVALID_QUESTION' }, 400)

    let vehicleQuery = client.from('vehicles').select('*')
    if (body.vehicleId) vehicleQuery = vehicleQuery.eq('id', body.vehicleId)
    const { data: vehicle, error: vehicleError } = await vehicleQuery.order('created_at').limit(1).maybeSingle()
    if (vehicleError) throw vehicleError
    if (!vehicle) return json({ error: 'VEHICLE_NOT_FOUND' }, 404)

    const { data: quotaRows, error: quotaError } = await client.rpc('claim_ai_request')
    if (quotaError) throw quotaError
    const quota = quotaRows?.[0]
    if (!quota?.allowed) {
      return json({
        error: 'AI_LIMIT_REACHED',
        plan: quota?.plan || 'FREE',
        used: quota?.ai_used ?? 0,
        limit: quota?.ai_limit ?? 5,
        remaining: 0,
        periodEnd: quota?.period_end ?? null,
      }, 402)
    }
    quotaClaimed = true

    const since = new Date()
    since.setMonth(since.getMonth() - 6)
    const { data: expenses, error: expenseError } = await client
      .from('expenses')
      .select('category, amount, date, mileage, description')
      .eq('vehicle_id', vehicle.id)
      .gte('date', since.toISOString().slice(0, 10))
      .order('date', { ascending: true })
    if (expenseError) throw expenseError

    const rows = expenses ?? []
    const monthKey = (date: string) => date.slice(0, 7)
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const monthly: Record<string, number> = {}
    const categories: Record<string, number> = {}
    for (const e of rows) {
      const amount = Number(e.amount || 0)
      const key = monthKey(e.date)
      monthly[key] = (monthly[key] || 0) + amount
      if (key === currentKey) categories[e.category] = (categories[e.category] || 0) + amount
    }
    const monthValues = Object.values(monthly)
    const avgMonthly = monthValues.length ? monthValues.reduce((a, b) => a + b, 0) / monthValues.length : 0
    const current = monthly[currentKey] || 0
    const previous = monthly[previousKey] || 0
    const annualProjection = avgMonthly * 12
    const costPerKm = vehicle.monthly_distance > 0 ? current / Number(vehicle.monthly_distance) : null

    const context = {
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        fuelType: vehicle.fuel_type,
        currentMileage: Number(vehicle.current_mileage || 0),
        fuelConsumption: Number(vehicle.fuel_consumption || 0),
        monthlyDistance: Number(vehicle.monthly_distance || 0),
      },
      currentMonthSpending: current,
      previousMonthSpending: previous,
      categoryTotals: categories,
      monthlyTotals: monthly,
      averageMonthlySpending: avgMonthly,
      projectedAnnualSpending: annualProjection,
      costPerKm,
      dataMonths: monthValues.length,
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini'
    if (!apiKey) {
      if ((Deno.env.get('AI_ALLOW_MOCK') || '').toLowerCase() !== 'true') {
        await client.rpc('refund_ai_request')
        quotaClaimed = false
        return json({ error: 'AI_NOT_CONFIGURED' }, 503)
      }
      const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]
      return json({
        answer: topCategory
          ? `Демо-ответ: в текущем месяце крупнейшая категория — «${topCategory[0]}» (€${Math.round(topCategory[1])}). Расходы за месяц: €${Math.round(current)}, прогноз на год: около €${Math.round(annualProjection)}.`
          : 'Демо-ответ: пока недостаточно данных для точного анализа.',
        usage: { used: quota.ai_used, limit: quota.ai_limit, remaining: quota.remaining, periodEnd: quota.period_end },
        provider: 'mock',
      })
    }

    const system = `Ты — финансовый ИИ-ассистент для владельца автомобиля. Отвечай только на русском языке. Используй только переданные данные пользователя. Не придумывай суммы, пробег, проценты или факты. Если данных недостаточно, прямо скажи об этом. Чётко отличай фактические данные от оценок и прогнозов. Ответ должен быть кратким, практичным и без лишнего текста.`

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: system,
        input: `Данные автомобиля и расходов:\n${JSON.stringify(context)}\n\nВопрос пользователя: ${question}`,
      }),
    })

    if (!aiResponse.ok) {
      const detail = await aiResponse.text()
      console.error('OpenAI error', aiResponse.status, detail.slice(0, 500))
      await client.rpc('refund_ai_request')
      quotaClaimed = false
      return json({ error: 'AI_PROVIDER_ERROR' }, 502)
    }

    const result = await aiResponse.json()
    const answer = result.output_text || result.output?.flatMap((x: any) => x.content || []).find((x: any) => x.type === 'output_text')?.text
    if (!answer) throw new Error('EMPTY_AI_RESPONSE')

    return json({
      answer,
      usage: { used: quota.ai_used, limit: quota.ai_limit, remaining: quota.remaining, periodEnd: quota.period_end },
      provider: 'openai',
    })
  } catch (error) {
    console.error(error)
    if (quotaClaimed && client) await client.rpc('refund_ai_request').catch(() => undefined)
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'UNAUTHORIZED') return json({ error: 'UNAUTHORIZED' }, 401)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
