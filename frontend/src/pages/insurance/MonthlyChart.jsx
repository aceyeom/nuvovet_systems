// 월별 검토 대상 금액: one quiet bar chart (recharts, lazy-loaded in its own chunk, §9.3).
// Square bars capped at 40 px, 30 % category gap, horizontal gridlines only. Past months use the muted
// grey (--chart-3), the latest month the one accent (--chart-1). The y-axis carries the unit (n만 원);
// there are no per-bar labels, exact values are in the tooltip and the aria-label.
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/ui/primitives/chart'
import { fmtWon, fmtWonCompact } from '@/ui/lib/format'

const CONFIG = { value: { label: '검토 대상 금액', color: 'var(--chart-1)' } }
const axisWon = (v) => (v >= 1e4 ? `${Math.round(v / 1e4).toLocaleString('en-US')}만 원` : v ? `${v.toLocaleString('en-US')}원` : '0')

export default function MonthlyChart({ data }) {
  const last = data.length - 1
  return (
    <ChartContainer
      config={CONFIG}
      className="aspect-auto h-50 w-full"
      role="img"
      aria-label={`월별 검토 대상 금액: ${data.map((d) => `${d.label} ${fmtWonCompact(d.value)}`).join(', ')}`}
    >
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
        <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={axisWon} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v) => <span className="num text-foreground">{fmtWon(v)}</span>} />} />
        <Bar dataKey="value" radius={0} maxBarSize={40} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.month} fill={i === last ? 'var(--chart-1)' : 'var(--chart-3)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
