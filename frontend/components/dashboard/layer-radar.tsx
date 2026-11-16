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

import { LAYER_LABELS } from "@/lib/labels";
import type { Layer, LayerScore } from "@/lib/types";

export function LayerRadar({ layers }: { layers: LayerScore[] }) {
  const data = layers.map((layer) => ({
    subject: LAYER_LABELS[layer.key as Layer] ?? layer.label,
    score: layer.score ?? 0,
    count: layer.count,
  }));

  return (
    <div className="h-72 w-full" role="img" aria-label="Radar du score des trois couches">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <defs>
            <linearGradient id="layersFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="var(--chart-grid)" strokeOpacity={0.7} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "var(--chart-text)", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
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
            formatter={(value) => [`${Number(value).toFixed(0)} / 100`, "Score de couche"]}
          />
          <Radar
            name="Score de couche"
            dataKey="score"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#layersFill)"
            dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
