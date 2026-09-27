import { isSupabaseConfigured, supabase } from '../supabase/client'

export type AiUsage = {
  used: number
  limit: number
  remaining: number
  periodEnd?: string | null
}

export type AiAssistantResult = {
  answer: string
  usage?: AiUsage
  provider?: 'openai' | 'mock'
}

export class AiAssistantError extends Error {
  code: string
  status?: number
  usage?: AiUsage
  constructor(code: string, message: string, status?: number, usage?: AiUsage) {
    super(message)
    this.code = code
    this.status = status
    this.usage = usage
  }
}

export async function askAiAssistant(question: string, vehicleId?: string): Promise<AiAssistantResult> {
  if (!isSupabaseConfigured || !supabase) throw new AiAssistantError('DEMO_MODE', 'Supabase не подключён.')
  const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { question, vehicleId } })
  if (error) {
    const context = (error as any).context
    let payload: any = null
    try { payload = context ? await context.json() : null } catch { /* noop */ }
    const code = payload?.error || 'AI_REQUEST_FAILED'
    const usage = payload ? { used: payload.used ?? 0, limit: payload.limit ?? 0, remaining: payload.remaining ?? 0, periodEnd: payload.periodEnd } : undefined
    const message = code === 'AI_LIMIT_REACHED'
      ? 'Лимит ИИ-запросов исчерпан.'
      : code === 'AI_NOT_CONFIGURED'
        ? 'ИИ пока не настроен владельцем сервиса.'
        : code === 'VEHICLE_NOT_FOUND'
          ? 'Сначала добавьте автомобиль.'
          : 'Не удалось получить ответ ИИ. Попробуйте ещё раз.'
    throw new AiAssistantError(code, message, context?.status, usage)
  }
  return data as AiAssistantResult
}
