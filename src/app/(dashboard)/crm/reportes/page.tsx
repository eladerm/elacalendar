"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  MessageCircle,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCheck,
  Download,
  Calendar,
  Send
} from 'lucide-react';
import { cn } from "@/lib/utils";

const periodOptions = ['Hoy', 'Esta semana', 'Este mes', 'Últimos 3 meses'];

// Datos de ejemplo para la visualización
const hourlyData = [
  { hour: '08h', msgs: 12 }, { hour: '09h', msgs: 34 }, { hour: '10h', msgs: 56 },
  { hour: '11h', msgs: 78 }, { hour: '12h', msgs: 45 }, { hour: '13h', msgs: 23 },
  { hour: '14h', msgs: 67 }, { hour: '15h', msgs: 89 }, { hour: '16h', msgs: 72 },
  { hour: '17h', msgs: 54 }, { hour: '18h', msgs: 38 }, { hour: '19h', msgs: 21 },
];
const maxMsg = Math.max(...hourlyData.map(d => d.msgs));

const agentData = [
  { name: 'Carolina M.', msgs: 142, avgTime: '3.2m', rate: '95%', color: 'bg-emerald-500' },
  { name: 'Pablo R.', msgs: 98, avgTime: '5.1m', rate: '88%', color: 'bg-blue-500' },
  { name: 'Sofía L.', msgs: 87, avgTime: '4.4m', rate: '91%', color: 'bg-violet-500' },
  { name: 'Diego H.', msgs: 65, avgTime: '6.8m', rate: '82%', color: 'bg-amber-500' },
];

const KpiCard = ({ title, value, change, positive, icon: Icon }: any) => (
  <Card className="bg-card border-border rounded-2xl overflow-hidden group hover:border-primary/30 transition-all">
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-muted rounded-xl group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border",
          positive ? "text-primary bg-primary/10 border-primary/20" : "text-destructive bg-destructive/10 border-destructive/20"
        )}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
    </CardContent>
  </Card>
);

export default function CRMReportesPage() {
  const [period, setPeriod] = useState('Esta semana');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Reportes de CRM
          </h1>
          <p className="text-muted-foreground font-bold mt-1 text-sm uppercase tracking-wider">
            Analítica de mensajería y rendimiento del equipo
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-muted p-1 rounded-xl border border-border">
            {periodOptions.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                  period === p ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-accent gap-2 font-black text-xs uppercase rounded-xl h-10">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Mensajes Recibidos" value="1,284" change="+12.5%" positive icon={MessageCircle} />
        <KpiCard title="Mensajes Enviados" value="943" change="+8.3%" positive icon={Send} />
        <KpiCard title="Tasa de Respuesta" value="94.2%" change="+2.1%" positive icon={CheckCheck} />
        <KpiCard title="Tiempo Promedio" value="4.2m" change="+0.8m" positive={false} icon={Clock} />
      </div>

      {/* Gráfico de Actividad por Hora */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-border">
          <CardTitle className="text-foreground font-black italic uppercase text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Actividad por Hora del Día
          </CardTitle>
          <CardDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
            Distribución de mensajes para: {period}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-end gap-2 h-48">
            {hourlyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[10px] font-black text-muted-foreground group-hover:text-primary transition-colors">{d.msgs}</span>
                <div
                  className="w-full bg-primary/80 rounded-t-lg transition-all shadow-lg group-hover:bg-primary shadow-primary/20"
                  style={{ height: `${(d.msgs / maxMsg) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-[9px] font-black text-muted-foreground uppercase group-hover:text-foreground transition-colors">{d.hour}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rendimiento por Agente */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-border">
          <CardTitle className="text-foreground font-black italic uppercase text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Rendimiento por Agente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="text-left px-6 py-3">Agente</th>
                <th className="text-right px-6 py-3">Mensajes</th>
                <th className="text-right px-6 py-3">Tiempo Promedio</th>
                <th className="text-right px-6 py-3">Satisfacción</th>
                <th className="px-6 py-3">Distribución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agentData.map((a, i) => (
                <tr key={i} className="hover:bg-accent transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-black text-xs italic opacity-90", a.color)}>
                        {a.name[0]}
                      </div>
                      <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-foreground text-sm">{a.msgs}</td>
                  <td className="px-6 py-4 text-right font-black text-muted-foreground text-sm">{a.avgTime}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-primary">{a.rate}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full opacity-90", a.color)}
                        style={{ width: `${(a.msgs / agentData[0].msgs) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
