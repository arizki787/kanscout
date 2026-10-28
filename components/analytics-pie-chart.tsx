"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsPieChartProps {
  statusData: ChartDataItem[];
  sourceData: ChartDataItem[];
  statusTotal: number;
  sourceTotal: number;
}

export default function AnalyticsPieChart({
  statusData,
  sourceData,
  statusTotal,
  sourceTotal,
}: AnalyticsPieChartProps) {
  const [distribution, setDistribution] = useState<"status" | "source">(
    "status",
  );
  const isStatusDistribution = distribution === "status";
  const data = isStatusDistribution ? statusData : sourceData;
  const total = isStatusDistribution ? statusTotal : sourceTotal;
  const emptyMessage = isStatusDistribution
    ? "No applications yet"
    : "No job postings yet";

  function toggleClasses(isSelected: boolean) {
    return `flex-1 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      isSelected
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900"
    }`;
  }

  return (
    <div className="flex flex-col items-center justify-between h-full gap-4 w-full">
      <div
        aria-label="Distribution type"
        className="flex w-full rounded-lg bg-gray-100 p-1"
        role="group"
      >
        <button
          type="button"
          aria-pressed={isStatusDistribution}
          className={toggleClasses(isStatusDistribution)}
          onClick={() => setDistribution("status")}
        >
          Status
        </button>
        <button
          type="button"
          aria-pressed={!isStatusDistribution}
          className={toggleClasses(!isStatusDistribution)}
          onClick={() => setDistribution("source")}
        >
          Source
        </button>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      ) : (
        <>
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
                  stroke="#ffffff"
                  strokeWidth={2}
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
                      total > 0
                        ? ((numValue / total) * 100).toFixed(1)
                        : "0";
                    return [`${numValue} (${pct}%)`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2 w-full pt-3 border-t border-gray-100">
            {data.map((entry) => {
              const pct =
                total > 0
                  ? ((entry.value / total) * 100).toFixed(1)
                  : "0";
              return (
                <div
                  key={entry.name}
                  className="flex items-center justify-between text-xs sm:text-sm"
                >
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
                    {entry.value}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({pct}%)
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
