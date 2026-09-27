import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>
}
