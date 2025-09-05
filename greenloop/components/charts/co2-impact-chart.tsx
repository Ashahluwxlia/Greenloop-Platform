"use client"

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

interface CO2ImpactChartProps {
  data: Array<{
    month: string
    actions: number
    points: number
    co2: number
  }>
}

export function CO2ImpactChart({ data }: CO2ImpactChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="co2" stroke="hsl(var(--chart-4))" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  )
}
