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
      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
        No applications yet
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-[220px] h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
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

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full">
        {data.map((entry) => {
          const pct =
            totalApplied > 0
              ? ((entry.value / totalApplied) * 100).toFixed(1)
              : "0";
          return (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {entry.value} <span className="text-xs font-normal text-muted-foreground">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
