"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type PieDatum = { name: string; value: number };
type BarDatum = { name: string; value: number };
type LineDatum = { name: string; value: number };

export function PieChartWidget({
  data,
  colors,
  height = 260,
  showLegend = true,
}: {
  data: PieDatum[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
}) {
  const palette = colors?.length ? colors : ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          {showLegend && <Legend verticalAlign="bottom" height={36}/>}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={5}
            cornerRadius={4}
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={palette[idx % palette.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({
    data,
    title,
    description
}: {
    data: { activity: string; value: number; fill: string }[];
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">{title}</h4>
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <RechartsTooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-xl border bg-background p-3 shadow-xl ring-1 ring-black/5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[0.65rem] uppercase font-bold text-muted-foreground tracking-wider">
                                                    Categoría
                                                </span>
                                                <span className="font-black text-primary">
                                                    {payload[0].name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[0.65rem] uppercase font-bold text-muted-foreground">Total:</span>
                                                    <span className="font-black">{payload[0].value}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="activity"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={8}
                            cornerRadius={6}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function BarChartWidget({
  data,
  height = 280,
}: {
  data: BarDatum[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#888', fontSize: 12, fontWeight: 600 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <RechartsTooltip 
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Bar 
            dataKey="value" 
            fill="#ec4899" 
            radius={[6, 6, 0, 0]} 
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChartWidget({
  data,
  height = 280,
}: {
  data: LineDatum[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#ec4899" 
            strokeWidth={3} 
            dot={{ r: 6, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
