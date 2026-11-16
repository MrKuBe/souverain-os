"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { AxisScore } from "@/lib/types";

const SHORT_LABELS: Record<string, string> = {
  license_model: "Licence",
  jurisdiction: "Juridiction",
  interoperability: "Interop.",
  operational_dependency: "MCO",
  business_criticality: "Criticité",
};

export function CriteriaRadar({ axes }: { axes: AxisScore[] }) {
  const data = axes.map((axis) => ({
    subject: SHORT_LABELS[axis.key] ?? axis.label,
    score: axis.score,
  }));

  return (
    <div className="h-72 w-full" role="img" aria-label="Radar des cinq critères de dépendance">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <defs>
            <linearGradient id="criteriaFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="var(--chart-grid)" strokeOpacity={0.7} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "var(--chart-text)", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            ticks={[25, 50, 75, 100]}
            tick={{ fill: "var(--chart-text)", fontSize: 9 }}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--tooltip-bg)",
              border: "1px solid var(--tooltip-border)",
              borderRadius: 12,
              color: "var(--tooltip-text)",
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value).toFixed(0)} / 100`, "Indice"]}
          />
          <Radar
            name="Indice"
            dataKey="score"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#criteriaFill)"
            dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
