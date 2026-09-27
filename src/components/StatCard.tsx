import type { LucideIcon } from 'lucide-react'

export function StatCard({ label, value, hint, icon: Icon, tone = 'blue' }: { label: string; value: string; hint?: string; icon: LucideIcon; tone?: 'blue' | 'green' | 'orange' | 'violet' }) {
  return (
    <article className="stat-card">
      <div className={`icon-box ${tone}`}><Icon size={19} /></div>
      <div>
        <div className="muted small">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </article>
  )
}
