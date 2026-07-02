'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#64748b', '#ec4899', '#06b6d4'];

interface PieDatum {
  name: string;
  value: number;
}

interface AdminStatusPieChartProps {
  data: PieDatum[];
}

export default function AdminStatusPieChart({ data }: AdminStatusPieChartProps) {
  if (!data.length) {
    return <p className="text-sm text-slate-400 py-16 text-center">Belum ada data pesanan</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} pesanan`, 'Jumlah']} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
