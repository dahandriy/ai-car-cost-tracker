import { CarFront } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark"><CarFront size={20} strokeWidth={2.2} /></span>
      {!compact && <span>AI Car Cost Tracker</span>}
    </div>
  )
}
