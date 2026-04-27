
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ActivityLog } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  BarChart3, 
  ArrowLeft, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  Building, 
  Store,
  Zap,
  ArrowDownToLine,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { PieChartWidget, BarChartWidget } from '@/components/charts';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InventoryStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== 'administrador') {
      router.push('/inventario');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'inventory'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(data);
      setLoading(false);
    });

    // Aumentamos el límite para un mejor análisis histórico
    const unsubLogs = onSnapshot(query(collection(db, 'activity_log'), orderBy('timestamp', 'desc'), limit(5000)), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
      setActivityLogs(data);
    });

    return () => {
      unsubProducts();
      unsubLogs();
    };
  }, []);

  const stats = useMemo(() => {
    const matrizProducts = products.filter(p => p.branch === 'Matriz');
    const valleProducts = products.filter(p => p.branch === 'Valle');

    const matrizStock = matrizProducts.reduce((acc, p) => acc + p.sealedCount, 0);
    const valleStock = valleProducts.reduce((acc, p) => acc + p.sealedCount, 0);

    const matrizLow = matrizProducts.filter(p => p.sealedCount <= p.minStock).length;
    const valleLow = valleProducts.filter(p => p.sealedCount <= p.minStock).length;

    // Mapas para conteo de rotación
    const finishedMapMatriz = new Map<string, number>();
    const finishedMapValle = new Map<string, number>();
    const entryMapMatriz = new Map<string, number>();
    const entryMapValle = new Map<string, number>();

    // Procesar Logs para Análisis de Velocidad
    activityLogs.forEach(log => {
      // 1. Análisis de Consumo (Terminados)
      if (log.action.includes('Terminó por:')) {
        const match = log.action.match(/"([^"]+)"/);
        if (match) {
          const name = match[1];
          const product = products.find(p => p.id === log.productId);
          const branch = product?.branch || (log.action.includes('Matriz') ? 'Matriz' : log.action.includes('Valle') ? 'Valle' : null);
          
          if (branch === 'Matriz') finishedMapMatriz.set(name, (finishedMapMatriz.get(name) || 0) + 1);
          if (branch === 'Valle') finishedMapValle.set(name, (finishedMapValle.get(name) || 0) + 1);
        }
      }

      // 2. Análisis de Reposición (Ingresos)
      if (log.action.includes('Ingresó')) {
        const qtyMatch = log.action.match(/Ingresó (\d+)/);
        const nameMatch = log.action.match(/"([^"]+)"/);
        if (qtyMatch && nameMatch) {
          const qty = parseInt(qtyMatch[1]);
          const name = nameMatch[1];
          const branch = log.action.includes('Matriz') ? 'Matriz' : log.action.includes('Valle') ? 'Valle' : null;
          
          if (branch === 'Matriz') entryMapMatriz.set(name, (entryMapMatriz.get(name) || 0) + qty);
          if (branch === 'Valle') entryMapValle.set(name, (entryMapValle.get(name) || 0) + qty);
        }
      }
    });

    const formatRanking = (map: Map<string, number>) => 
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Distribución por categorías
    const categoryMap = new Map<string, number>();
    products.forEach(p => {
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + p.sealedCount);
    });

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const branchData = [
      { name: 'MATRIZ', value: matrizStock },
      { name: 'VALLE', value: valleStock }
    ];

    return {
      matrizStock,
      valleStock,
      matrizLow,
      valleLow,
      categoryData,
      branchData,
      totalItems: products.length,
      finishedMatriz: formatRanking(finishedMapMatriz),
      finishedValle: formatRanking(finishedMapValle),
      entriesMatriz: formatRanking(entryMapMatriz),
      entriesValle: formatRanking(entryMapValle)
    };
  }, [products, activityLogs]);

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Cargando estadísticas...</div>;

  const RankingList = ({ data, icon: Icon, colorClass, label }: { data: {name: string, value: number}[], icon: any, colorClass: string, label: string }) => (
    <div className="space-y-4">
      {data.length > 0 ? data.map((item, index) => (
        <div key={item.name} className="flex items-center gap-4">
          <div className="w-8 text-center font-black text-muted-foreground">#{index + 1}</div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <span className="font-bold uppercase text-[11px] truncate max-w-[180px]">{item.name}</span>
              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", colorClass)}>
                {item.value} {label}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", colorClass.split(' ')[0].replace('text-', 'bg-'))} 
                style={{ width: `${(item.value / data[0].value) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )) : (
        <div className="text-center py-10 text-muted-foreground italic text-xs">
          Sin datos suficientes para este ranking.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-muted/10">
      
      <main className="container py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/inventario">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase text-primary">
                Dashboard de Inventario
              </h1>
              <p className="text-muted-foreground font-medium">Análisis de stock, consumo y comparativa de sedes.</p>
            </div>
          </div>
        </div>

        {/* Resumen Global */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm bg-pink-600 text-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Building className="w-8 h-8 absolute -right-2 -top-2 opacity-20 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80">Stock Matriz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{stats.matrizStock}</div>
              <p className="text-xs font-bold mt-1 opacity-90">{stats.matrizLow} productos en stock crítico</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-purple-700 text-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Store className="w-8 h-8 absolute -right-2 -top-2 opacity-20 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80">Stock Valle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{stats.valleStock}</div>
              <p className="text-xs font-bold mt-1 opacity-90">{stats.valleLow} productos en stock crítico</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Zap className="w-8 h-8 absolute -right-2 -top-2 text-yellow-500 opacity-10 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Catálogo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground">{stats.totalItems}</div>
              <p className="text-xs font-bold text-muted-foreground mt-1 uppercase">Insumos registrados</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Activity className="w-8 h-8 absolute -right-2 -top-2 text-green-500 opacity-10 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Movimiento Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-600">{activityLogs.length}</div>
              <p className="text-xs font-bold text-muted-foreground mt-1 uppercase">Acciones registradas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rotation" className="w-full">
          <TabsList className="bg-white border p-1 rounded-xl h-12 w-full max-w-lg">
            <TabsTrigger value="rotation" className="rounded-lg font-bold uppercase text-xs flex-1">Velocidad de Rotación</TabsTrigger>
            <TabsTrigger value="overview" className="rounded-lg font-bold uppercase text-xs flex-1">Estado de Sedes</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg font-bold uppercase text-xs flex-1">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="rotation" className="pt-6 space-y-6">
            {/* Análisis de Consumo Rápido */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-red-50/50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                    <CardTitle className="text-lg font-black uppercase">Consumo Rápido: Matriz</CardTitle>
                  </div>
                  <CardDescription>Productos que se terminan con mayor frecuencia.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <RankingList data={stats.finishedMatriz} icon={CheckCircle2} colorClass="bg-red-100 text-red-700" label="terminados" />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-purple-50/50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-700" />
                    <CardTitle className="text-lg font-black uppercase">Consumo Rápido: Valle</CardTitle>
                  </div>
                  <CardDescription>Insumos agotados con mayor frecuencia en cabina.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <RankingList data={stats.finishedValle} icon={CheckCircle2} colorClass="bg-purple-100 text-purple-700" label="terminados" />
                </CardContent>
              </Card>
            </div>

            {/* Análisis de Reposición Rápida */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-green-50/50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-lg font-black uppercase">Reposición: Matriz</CardTitle>
                  </div>
                  <CardDescription>Volumen total de unidades ingresadas a bodega.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <RankingList data={stats.entriesMatriz} icon={Package} colorClass="bg-green-100 text-green-700" label="unidades" />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-blue-50/50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg font-black uppercase">Reposición: Valle</CardTitle>
                  </div>
                  <CardDescription>Flujo de entrada de mercadería por volumen.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <RankingList data={stats.entriesValle} icon={Package} colorClass="bg-blue-100 text-blue-700" label="unidades" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Comparativa de Stock Sellado
                  </CardTitle>
                  <CardDescription>Distribución de insumos nuevos por sucursal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartWidget data={stats.branchData} height={350} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Estado de Bodega
                  </CardTitle>
                  <CardDescription>Sucursal con mayor cantidad de productos críticos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-2xl border border-pink-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-pink-600 p-2 rounded-full text-white"><Building className="w-4 h-4" /></div>
                      <span className="font-black uppercase text-pink-900">Matriz</span>
                    </div>
                    <Badge className="bg-pink-600 text-white font-black">{stats.matrizLow} CRÍTICOS</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-700 p-2 rounded-full text-white"><Store className="w-4 h-4" /></div>
                      <span className="font-black uppercase text-purple-900">Valle</span>
                    </div>
                    <Badge className="bg-purple-700 text-white font-black">{stats.valleLow} CRÍTICOS</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-orange-500" />
                    Distribución de Insumos por Categoría
                  </CardTitle>
                  <CardDescription>Cantidad de unidades selladas por tipo de producto.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartWidget data={stats.categoryData} height={400} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase">Resumen por Categoría</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-y-auto">
                    {stats.categoryData.slice(0, 8).map((cat, idx) => (
                      <div key={cat.name} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-muted-foreground w-4">{idx + 1}</span>
                          <span className="text-xs font-bold uppercase truncate max-w-[150px]">{cat.name}</span>
                        </div>
                        <Badge variant="secondary" className="font-black">{cat.value} UNID</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
