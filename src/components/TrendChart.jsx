import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import { useMemo } from "react";

export default function TrendChart({ title, data }) {
  // data: [{ label: 'MM-DD', value: <mmol number> }, ...]

  // 그래프 범위(도메인) 계산: 최소/최대에 여유 0.5 추가
  const domain = useMemo(() => {
    if (!data?.length) return [0, 10];
    const vals = data.map(d => Number(d.value)).filter(v => !isNaN(v));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = 0.5;
    return [Math.max(0, +(min - pad).toFixed(1)), +(max + pad).toFixed(1)];
  }, [data]);

  // Y축 tick 포맷: 소수점 한 자리
  const yTickFormatter = (v) => (typeof v === 'number' ? v.toFixed(1) : v);

  // Tooltip 값 포맷
  const tooltipFormatter = (value) => [`${Number(value).toFixed(1)} mmol/L`, "Value"];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis
              domain={domain}
              tickFormatter={yTickFormatter}
              allowDecimals={true}
              label={{ value: "mmol/L", angle: -90, position: "insideLeft" }} // ⬅️ 단위 표기
            />
            <Tooltip formatter={tooltipFormatter} />
            {/* 점(도트)와 hover 강조 */}
            <Line type="monotone" dataKey="value" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
