
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { User as UserType, ActivityLog } from '@/lib/types';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { User, Mail, Shield, BarChart2, TrendingUp, Users, Zap, Calendar, Target } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { BarChartWidget, PieChartWidget } from '@/components/charts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ReportDialog = dynamic(() => import('@/components/report-dialog').then(mod => mod.default));

export default function ReportesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== 'administrador') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (querySnapshot) => {
      const usersData: UserType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'inactive') {
          usersData.push({ id: doc.id, ...data } as UserType);
        }
      });
      setUsers(usersData);
    });

    const unsubLogs = onSnapshot(query(collection(db, 'activity_log'), orderBy('timestamp', 'desc')), (querySnapshot) => {
        const logsData: ActivityLog[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            logsData.push({ 
                id: doc.id, 
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
            } as ActivityLog);
        });
        setActivityLogs(logsData);
    });

    return () => {
        unsubUsers();
        unsubLogs();
    };
  }, []);

  const stats = useMemo(() => {
    // Filtrar administradores: No queremos sus estadísticas en este panel
    const nonAdminUsers = users.filter(u => u.role !== 'administrador');
    const nonAdminIds = new Set(nonAdminUsers.map(u => u.id));
    
    const userStatsMap = new Map<string, { total: number; name: string; role: string; photo?: string }>();
    
    // Inicializar solo usuarios operativos
    nonAdminUsers.forEach(u => {
        userStatsMap.set(u.id, { total: 0, name: u.name, role: u.role, photo: u.photoUrl });
    });

    // Contar logs solo de usuarios operativos
    const nonAdminLogs = activityLogs.filter(log => nonAdminIds.has(log.userId));

    nonAdminLogs.forEach(log => {
      const current = userStatsMap.get(log.userId);
      if (current) {
        userStatsMap.set(log.userId, { ...current, total: current.total + 1 });
      }
    });

    const sortedUsers = Array.from(userStatsMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    const maxActivity = sortedUsers.length > 0 ? sortedUsers[0].total : 1;

    // Categorización de acciones (solo operativo)
    const categoryCounts: { [key: string]: number } = {};
    nonAdminLogs.forEach(log => {
        const action = log.action.toLowerCase();
        let cat = 'Otras';
        if (action.includes('cita')) cat = 'Citas';
        else if (action.includes('cliente')) cat = 'Clientes';
        else if (action.includes('recordatorio')) cat = 'Recordatorios';
        else if (action.includes('servicio')) cat = 'Servicios';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const pieData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    return {
      sortedUsers,
      maxActivity,
      totalActions: nonAdminLogs.length,
      topUser: sortedUsers[0],
      pieData,
      barData: sortedUsers.slice(0, 8).map(u => ({ name: u.name.split(' ')[0], value: u.total })),
      nonAdminCount: nonAdminUsers.length
    };
  }, [users, activityLogs]);

  const handleViewReport = (u: UserType) => {
    setSelectedUser(u);
    setIsReportOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'administrador': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">Admin</Badge>;
      case 'administrador_sucursal': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Gerente</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Operaria</Badge>;
    }
  };

  if (authLoading || !user) return <div className="flex h-screen w-full items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen w-full bg-muted/10">
      <SiteHeader />
      <main className="container py-8 space-y-8">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Reportes de Rendimiento Operativo</h1>
            <p className="text-muted-foreground">Analiza la actividad de las operarias y administradoras de sucursal (excluye administradores generales).</p>
        </div>

        {/* Global Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border-none bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Acciones Operativas</CardTitle>
                    <Zap className="w-4 h-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalActions}</div>
                    <p className="text-xs text-muted-foreground">Realizadas por el personal</p>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-none bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Colaboradora más Activa</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold truncate">{stats.topUser?.name || '---'}</div>
                    <p className="text-xs text-muted-foreground">{stats.topUser?.total || 0} operaciones</p>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-none bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Personal Operativo</CardTitle>
                    <Users className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.nonAdminCount}</div>
                    <p className="text-xs text-muted-foreground">Gerentes y operarias activas</p>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-none bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Eficiencia de Uso</CardTitle>
                    <Target className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.nonAdminCount > 0 ? Math.round(stats.totalActions / stats.nonAdminCount) : 0}</div>
                    <p className="text-xs text-muted-foreground">Acciones prom. por persona</p>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
                <TabsTrigger value="overview">Vista General</TabsTrigger>
                <TabsTrigger value="ranking">Ranking del Personal</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="lg:col-span-4 shadow-sm border-none bg-white">
                        <CardHeader>
                            <CardTitle>Top Colaboradoras</CardTitle>
                            <CardDescription>Comparativa de acciones realizadas por el personal más activo.</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <BarChartWidget data={stats.barData} height={300} />
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-3 shadow-sm border-none bg-white">
                        <CardHeader>
                            <CardTitle>Distribución de Trabajo</CardTitle>
                            <CardDescription>¿En qué áreas se enfoca el personal?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PieChartWidget 
                                data={stats.pieData} 
                                height={300} 
                                colors={['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']}
                            />
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="ranking" className="space-y-6">
                {stats.sortedUsers.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stats.sortedUsers.map((u, index) => {
                            const originalUser = users.find(user => user.id === u.id);
                            if (!originalUser) return null;
                            
                            const percentage = stats.maxActivity > 0 ? (u.total / stats.maxActivity) * 100 : 0;

                            return (
                                <Card key={u.id} className="group overflow-hidden shadow-sm hover:shadow-md transition-all border-none bg-white">
                                    <div className="h-1.5 w-full bg-muted">
                                        <div 
                                            className="h-full bg-primary transition-all duration-1000" 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-primary/10">
                                                    <AvatarImage src={u.photo || ''} className="object-cover" />
                                                    <AvatarFallback className="bg-secondary text-primary font-bold">
                                                        {u.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight uppercase truncate max-w-[150px]">{u.name}</h3>
                                                    <div className="mt-1">{getRoleBadge(u.role)}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-primary">#{index + 1}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <Zap className="w-3.5 h-3.5" /> Acciones totales
                                                </span>
                                                <span className="font-bold">{u.total}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5" /> Correo
                                                </span>
                                                <span className="truncate max-w-[140px] text-xs font-medium">{originalUser.email}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-0 border-t bg-muted/5 group-hover:bg-primary/5 transition-colors">
                                        <Button 
                                            variant="ghost" 
                                            className="w-full rounded-none h-12 gap-2 text-primary font-bold"
                                            onClick={() => handleViewReport(originalUser)}
                                        >
                                            <BarChart2 className="w-4 h-4" />
                                            Ver Reporte Detallado
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center text-muted-foreground bg-white rounded-xl shadow-sm">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No hay personal operativo registrado con actividad.</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
      </main>

       <Suspense fallback={null}>
         {isReportOpen && selectedUser && (
            <ReportDialog
                isOpen={isReportOpen}
                onOpenChange={setIsReportOpen}
                user={selectedUser}
                allLogs={activityLogs.filter(log => log.userId === selectedUser.id)}
            />
        )}
      </Suspense>
    </div>
  );
}
