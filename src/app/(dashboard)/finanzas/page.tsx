
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  WalletMinimal, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Building, 
  Store,
  DollarSign,
  Package,
  Download,
  ArrowUpRight,
  Target,
  Truck
} from 'lucide-react';
import { PieChartWidget, BarChartWidget } from '@/components/charts';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from 'xlsx';

export default function FinanzasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== 'administrador' && !user?.permissions?.finanzas?.ver) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'inventory'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(data);
      setLoading(false);
    });
    return () => unsubProducts();
  }, []);

  const financialStats = useMemo(() => {
    const matrizVal = products
      .filter(p => p.branch === 'Matriz')
      .reduce((acc, p) => acc + ((p.sealedCount + p.inUseCount) * (p.unitPrice || 0)), 0);
    
    const valleVal = products
      .filter(p => p.branch === 'Valle')
      .reduce((acc, p) => acc + ((p.sealedCount + p.inUseCount) * (p.unitPrice || 0)), 0);

    const totalInvestment = matrizVal + valleVal;

    // Inversión por Categoría
    const catMap = new Map<string, number>();
    products.forEach(p => {
      const val = (p.sealedCount + p.inUseCount) * (p.unitPrice || 0);
      catMap.set(p.category, (catMap.get(p.category) || 0) + val);
    });

    const categoryData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Valorización por Ubicación (Bodega vs Cabina)
    const bodegaVal = products
      .filter(p => p.location === 'BODEGA')
      .reduce((acc, p) => acc + (p.sealedCount * (p.unitPrice || 0)), 0);
    
    const cabinaVal = products
      .filter(p => p.location === 'ESTABLECIMIENTO')
      .reduce((acc, p) => acc + ((p.sealedCount + p.inUseCount) * (p.unitPrice || 0)), 0);

    const locationData = [
      { name: 'BODEGA', value: bodegaVal },
      { name: 'CABINA', value: cabinaVal }
    ];

    // Top Proveedores/Distribuidores por Valor de Inventario
    const distMap = new Map<string, number>();
    products.forEach(p => {
      const dist = p.brand || 'SIN ESPECIFICAR';
      const val = (p.sealedCount + p.inUseCount) * (p.unitPrice || 0);
      distMap.set(dist, (distMap.get(dist) || 0) + val);
    });

    const topDistributors = Array.from(distMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      matrizVal,
      valleVal,
      totalInvestment,
      categoryData,
      locationData,
      topDistributors
    };
  }, [products]);

  const handleExportFinancialReport = () => {
    const data = products.map(p => ({
      CODIGO: p.code || '---',
      PRODUCTO: p.name,
      MARCA: p.brand || '---',
      CATEGORIA: p.category,
      SEDE: p.branch,
      UBICACION: p.location,
      STOCK_SELLADO: p.sealedCount,
      UNIDAD: p.unit,
      EN_USO: p.inUseCount,
      PRESENTACION: p.packageSize || '---',
      P_UNITARIO: p.unitPrice || 0,
      VALOR_TOTAL: (p.sealedCount + p.inUseCount) * (p.unitPrice || 0),
      PROVEEDOR: p.commercialName || '---',
      TELEFONO_PROV: p.distributorPhone || '---'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Financiero");
    XLSX.writeFile(wb, `Reporte_Financiero_ElaPiel_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Cargando datos financieros...</div>;

  return (
    <div className="min-h-screen w-full bg-muted/5">
      
      <main className="container py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-primary flex items-center gap-3">
              <WalletMinimal className="w-8 h-8" />
              Control Financiero
            </h1>
            <p className="text-muted-foreground font-medium">Valorización de activos e inversión en suministros.</p>
          </div>
          <Button onClick={handleExportFinancialReport} className="bg-primary hover:bg-primary/90 font-black uppercase text-xs h-11 px-6 shadow-lg shadow-primary/20">
            <Download className="mr-2 h-4 w-4" /> Descargar Reporte Completo
          </Button>
        </div>

        {/* Resumen de Valorización */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm bg-primary text-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <DollarSign className="w-8 h-8 absolute -right-2 -top-2 opacity-20 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80">Inversión Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">${financialStats.totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-[10px] font-bold mt-1 uppercase opacity-90">Valorización total de inventario</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Building className="w-8 h-8 absolute -right-2 -top-2 text-pink-600 opacity-10 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Valor Matriz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-pink-600">${financialStats.matrizVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Sede ÉlaPiel Matriz</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Store className="w-8 h-8 absolute -right-2 -top-2 text-purple-700 opacity-10 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Valor Valle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-purple-700">${financialStats.valleVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Sede ÉlaPiel Valle</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <CardHeader className="pb-2">
              <Truck className="w-8 h-8 absolute -right-2 -top-2 text-orange-500 opacity-10 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">En Bodega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-orange-600">${financialStats.locationData.find(d => d.name === 'BODEGA')?.value.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</div>
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Valor en stock sellado</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="investment" className="w-full">
          <TabsList className="bg-white border p-1 rounded-xl h-12 w-full max-w-md">
            <TabsTrigger value="investment" className="rounded-lg font-bold uppercase text-xs flex-1">Distribución</TabsTrigger>
            <TabsTrigger value="ranking" className="rounded-lg font-bold uppercase text-xs flex-1">Ranking Gasto</TabsTrigger>
            <TabsTrigger value="details" className="rounded-lg font-bold uppercase text-xs flex-1">Listado Valorizado</TabsTrigger>
          </TabsList>

          <TabsContent value="investment" className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-primary" />
                    Inversión por Categoría
                  </CardTitle>
                  <CardDescription>Valorización acumulada según el tipo de insumo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartWidget data={financialStats.categoryData} height={350} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                    Valorización por Sede
                  </CardTitle>
                  <CardDescription>Comparativa de activos líquidos entre establecimientos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartWidget 
                    data={[
                      { name: 'MATRIZ', value: financialStats.matrizVal },
                      { name: 'VALLE', value: financialStats.valleVal }
                    ]} 
                    height={350} 
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Ranking de Valor por Insumo
                  </CardTitle>
                  <CardDescription>Productos que representan la mayor inversión económica.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products
                      .map(p => ({ name: `${p.name} (${p.brand})`, value: (p.sealedCount + p.inUseCount) * (p.unitPrice || 0) }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 10)
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-8 text-center font-black text-muted-foreground">#{idx + 1}</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-end mb-1">
                              <span className="font-bold uppercase text-xs truncate">{item.name}</span>
                              <span className="text-[10px] font-black text-primary">${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${(item.value / (financialStats.totalInvestment || 1)) * 100 * 5}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase">Valor por Marca</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-y-auto">
                    {financialStats.topDistributors.map((dist, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-muted-foreground w-4">{idx + 1}</span>
                          <span className="text-xs font-bold uppercase truncate max-w-[120px]">{dist.name}</span>
                        </div>
                        <Badge variant="secondary" className="font-black text-[10px] bg-primary/10 text-primary border-none">
                          ${dist.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="pt-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-4 bg-muted/20 border-b">
                <CardTitle className="text-lg font-black uppercase">Inventario Detallado con Precios</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-black uppercase text-[10px]">Producto / Código</TableHead>
                        <TableHead className="font-black uppercase text-[10px]">Categoría</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-center">Sede/Loc</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-center">Total Unid.</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-right">P. Unitario</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-right">Valorización</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((p) => {
                          const totalUnits = p.sealedCount + p.inUseCount;
                          const totalVal = totalUnits * (p.unitPrice || 0);
                          
                          return (
                            <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-black uppercase text-xs">{p.name}</span>
                                  <span className="text-[9px] text-muted-foreground font-bold">{p.code || 'SIN COD'} | {p.brand}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] font-bold uppercase">{p.category}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={cn("text-[9px] font-black uppercase px-2", p.branch === 'Matriz' ? "bg-pink-600" : "bg-purple-700")}>
                                  {p.branch?.charAt(0) || '?'} - {p.location === 'BODEGA' ? 'B' : 'C'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-black">{totalUnits}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase font-bold">{p.unit} {p.packageSize && `(${p.packageSize})`}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-xs">${(p.unitPrice || 0).toFixed(3)}</TableCell>
                              <TableCell className="text-right font-black text-xs text-primary">${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
