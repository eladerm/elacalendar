
"use client";

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ActivityChart } from '@/components/charts';
import type { ActivityLog, User } from '@/lib/types';
import { BarChart2, Calendar, UserPlus, FileUp, FileDown, Pencil, Trash2, Clock, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  allLogs: ActivityLog[];
}

const colors = [
    "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
    "#ef4444", "#06b6d4", "#6366f1", "#a855f7", "#14b8a6"
];

const categorizeAction = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('creó una nueva cita') || lowerAction.includes('reagendó la cita')) return 'Citas Agendadas';
    if (lowerAction.includes('creó al cliente') || lowerAction.includes('importó masivamente')) return 'Gestión Clientes';
    if (lowerAction.includes('modificó la cita')) return 'Citas Modificadas';
    if (lowerAction.includes('canceló la cita')) return 'Citas Canceladas';
    if (lowerAction.includes('envió un recordatorio')) return 'Recordatorios';
    if (lowerAction.includes('servicio')) return 'Servicios';
    return 'Otras Acciones';
};

const getActionIcon = (category: string) => {
    switch (category) {
        case 'Citas Agendadas': return <Calendar className="w-4 h-4" />;
        case 'Gestión Clientes': return <UserPlus className="w-4 h-4" />;
        case 'Citas Modificadas': return <Pencil className="w-4 h-4" />;
        case 'Citas Canceladas': return <Trash2 className="w-4 h-4" />;
        case 'Recordatorios': return <CheckCircle2 className="w-4 h-4" />;
        default: return <Zap className="w-4 h-4" />;
    }
}

export default function ReportDialog({ isOpen, onOpenChange, user, allLogs }: ReportDialogProps) {
  const [isActivityDetailsOpen, setIsActivityDetailsOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<{ category: string, logs: ActivityLog[] } | null>(null);

  const reportData = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return { chartData: [], stats: [], totalActions: 0, totalAppointments: 0 };
    
    const actionCounts: { [key: string]: number } = {};
    let totalAppointments = 0;

    allLogs.forEach(log => {
      const category = categorizeAction(log.action);
      actionCounts[category] = (actionCounts[category] || 0) + 1;
      if (category === 'Citas Agendadas') {
        totalAppointments++;
      }
    });

    const chartData = Object.entries(actionCounts).map(([activity, value], index) => ({
      activity,
      value,
      fill: colors[index % colors.length],
    })).sort((a,b) => b.value - a.value);

    const stats = chartData.map(item => ({
        ...item,
        icon: getActionIcon(item.activity)
    }));

    return { chartData, stats, totalActions: allLogs.length, totalAppointments };
  }, [allLogs]);

  const handleStatClick = (category: string) => {
    const filteredLogs = allLogs
      .filter(log => categorizeAction(log.action) === category)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setSelectedActivity({ category, logs: filteredLogs });
    setIsActivityDetailsOpen(true);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl overflow-hidden p-0 gap-0">
        <div className="bg-primary p-8 text-primary-foreground relative">
            <div className="flex items-center gap-6 relative z-10">
                <Avatar className="h-20 w-20 border-4 border-white/20">
                    <AvatarImage src={user.photoUrl || ''} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-white text-2xl font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{user.name}</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none capitalize">
                            {user.role.replace('_', ' ')}
                        </Badge>
                        <span className="text-white/60 text-sm">{user.email}</span>
                    </div>
                </div>
            </div>
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BarChart2 className="w-32 h-32" />
            </div>
        </div>

        <div className="p-8">
            <DialogDescription className="mb-6 text-lg font-medium text-foreground">
                Rendimiento histórico: <span className="text-primary font-bold">{reportData.totalActions} acciones realizadas.</span>
            </DialogDescription>
            
            {reportData.totalActions > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Impacto por categoría</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {reportData.stats.map(stat => (
                                <button 
                                    key={stat.activity} 
                                    onClick={() => handleStatClick(stat.activity)}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-muted group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.fill}20`, color: stat.fill }}>
                                            {stat.icon}
                                        </div>
                                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">{stat.activity}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black">{stat.value}</span>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <ActivityChart 
                            data={reportData.chartData} 
                            title="Desglose Visual"
                            description="Porcentaje de uso por tipo de acción."
                        />
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-2xl">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">Este usuario aún no tiene actividad registrada.</p>
                </div>
            )}
        </div>

        <DialogFooter className="p-6 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto font-bold">
            Cerrar Reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {selectedActivity && (
        <Dialog open={isActivityDetailsOpen} onOpenChange={setIsActivityDetailsOpen}>
            <DialogContent className="sm:max-w-xl">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getActionIcon(selectedActivity.category)}
                        {selectedActivity.category}: {user.name}
                    </DialogTitle>
                    <DialogDescription>
                        Lista cronológica de acciones realizadas en esta categoría.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-3 py-4">
                        {selectedActivity.logs.map(log => (
                            <div key={log.id} className="p-4 rounded-xl border bg-muted/10 flex items-start gap-3">
                                <div className="p-2 bg-background rounded-full mt-0.5">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold leading-relaxed text-foreground">{log.action}</p>
                                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                                        {format(log.timestamp, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                 <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setIsActivityDetailsOpen(false)} className="font-bold">
                        Volver al Resumen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )}
    </>
  );
}
