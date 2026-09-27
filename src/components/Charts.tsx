import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'

const pieColors = ['#0d65f6', '#15a46d', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#64748b']

export function SpendingChart({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 5, bottom: 0, left: -20 }}>
          <defs><linearGradient id="spend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d65f6" stopOpacity={0.28}/><stop offset="100%" stopColor="#0d65f6" stopOpacity={0.02}/></linearGradient></defs>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} formatter={(v: number | string) => [`€${Number(v).toFixed(0)}`, 'Расходы']} />
          <Area type="monotone" dataKey="value" stroke="#0d65f6" strokeWidth={3} fill="url(#spend)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="category-chart-grid">
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">{data.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}</Pie><Tooltip formatter={(v: number | string) => `€${Number(v).toFixed(0)}`} /></PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-list">
        {data.slice(0, 6).map((item, i) => <div className="legend-row" key={item.name}><span className="legend-dot" style={{ background: pieColors[i % pieColors.length] }} /><span>{item.name}</span><strong>€{item.value.toFixed(0)}</strong></div>)}
      </div>
    </div>
  )
}
