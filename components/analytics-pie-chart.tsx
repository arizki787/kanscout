"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsPieChartProps {
  data: ChartDataItem[];
  totalApplied: number;
}

export default function AnalyticsPieChart({
  data,
  totalApplied,
}: AnalyticsPieChartProps) {
  if (totalApplied === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No applications yet
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between h-full gap-4 w-full">
      {/* Responsive Chart Container: 160px on mobile, 180px on desktop */}
      <div className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] shrink-0 my-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "8px 14px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                fontSize: "13px",
              }}
              formatter={(value, name) => {
                const numValue = Number(value);
                const pct =
                  totalApplied > 0
                    ? ((numValue / totalApplied) * 100).toFixed(1)
                    : "0";
                return [`${numValue} (${pct}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend List */}
      <div className="flex flex-col gap-2 w-full pt-3 border-t border-gray-100">
        {data.map((entry) => {
          const pct =
            totalApplied > 0
              ? ((entry.value / totalApplied) * 100).toFixed(1)
              : "0";
          return (
            <div key={entry.name} className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 truncate max-w-[120px] sm:max-w-none">
                  {entry.name}
                </span>
              </div>
              <span className="font-semibold text-gray-900 shrink-0">
                {entry.value} <span className="text-[11px] font-normal text-muted-foreground">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}