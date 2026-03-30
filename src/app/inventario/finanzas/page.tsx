
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ActivityLog } from '@/lib/types';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, getDoc, doc, getDocs, where } from 'firebase/firestore';
import { 
  WalletMinimal, 
  PieChart as PieChartIcon, 
  Building, 
  Store,
  DollarSign,
  Download,
  ArrowUpRight,
  Target,
  Truck,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Layers,
  TrendingUp,
  ArrowDownToLine,
  Zap
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
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

interface BranchStats {
  bodega: number;
  cabina: number;
  enUso: number;
  terminado: number;
  totalActivo: number;
}

const BranchSummary = ({ title, stats, colorClass, icon: Icon }: { title: string, stats: BranchStats, colorClass: string, icon: any }) => (
  <Card className="border-none shadow-sm overflow-hidden bg-white">
    <CardHeader className={cn("pb-2 border-b", colorClass)}>
      <div className="flex items-center justify-between">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </CardTitle>
        <Badge variant="outline" className="bg-white/20 text-white border-white/30 font-black">
          ACTIVO: ${stats.totalActivo.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4 p-4">
      <div className="space-y-1">
        <p className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
          <Truck className="w-3 h-3" /> Bodega
        </p>
        <p className="text-sm font-black">${stats.bodega.toLocaleString('en-US', { minimumFractionDigits: 3 })}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
          <Store className="w-3 h-3" /> Cabina
        </p>
        <p className="text-sm font-black">${stats.cabina.toLocaleString('en-US', { minimumFractionDigits: 3 })}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black text-primary uppercase flex items-center gap-1">
          <Activity className="w-3 h-3" /> En Uso
        </p>
        <p className="text-sm font-black text-primary">${stats.enUso.toLocaleString('en-US', { minimumFractionDigits: 3 })}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Terminado
        </p>
        <p className="text-sm font-black text-slate-500">${stats.terminado.toLocaleString('en-US', { minimumFractionDigits: 3 })}</p>
      </div>
    </CardContent>
  </Card>
);

const RankingList = ({ data, colorClass, label }: { data: {name: string, value: number}[], colorClass: string, label: string }) => (
  <div className="space-y-4">
    {data.length > 0 ? data.map((item, index) => (
      <div key={item.name} className="flex items-center gap-4">
        <div className="w-8 text-center font-black text-muted-foreground">#{index + 1}</div>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-1">
            <span className="font-bold uppercase text-[10px] truncate max-w-[160px]">{item.name}</span>
            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", colorClass)}>
              {item.value} {label}
            </span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full", colorClass.split(' ')[0].replace('text-', 'bg-'))} 
              style={{ width: `${(item.value / (data[0]?.value || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )) : (
      <div className="text-center py-10 text-muted-foreground italic text-[10px]">Sin datos suficientes.</div>
    )}
  </div>
);

export default function FinanzasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<'Matriz' | 'Valle'>('Matriz');

  useEffect(() => {
    if (user?.branch) {
      setSelectedBranch(user.branch);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'administrador' && !user?.permissions?.finanzas?.ver) {
      router.push('/inventario');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'inventory'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(data);
      setLoading(false);
    });

    const unsubLogs = onSnapshot(query(collection(db, 'activity_log'), orderBy('timestamp', 'desc'), limit(2000)), (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        timestamp: d.data().timestamp?.toDate() 
      } as ActivityLog));
      setActivityLogs(data);
    });

    return () => {
      unsubProducts();
      unsubLogs();
    };
  }, []);

  const statsByBranch = useMemo(() => {
    const calculateFor = (filterFn: (p: Product) => boolean): BranchStats => {
      const filtered = products.filter(filterFn);
      const bodega = filtered
        .filter(p => p.location === 'BODEGA')
        .reduce((acc, p) => acc + (p.sealedCount * (p.unitPrice || 0)), 0);
      
      const cabina = filtered
        .filter(p => p.location === 'ESTABLECIMIENTO')
        .reduce((acc, p) => acc + (p.sealedCount * (p.unitPrice || 0)), 0);
      
      const enUso = filtered.reduce((acc, p) => acc + (p.inUseCount * (p.unitPrice || 0)), 0);
      const terminado = filtered.reduce((acc, p) => acc + ((p.finishedCount || 0) * (p.unitPrice || 0)), 0);
      
      return {
        bodega,
        cabina,
        enUso,
        terminado,
        totalActivo: bodega + cabina + enUso
      };
    };

    return {
      matriz: calculateFor(p => p.branch === 'Matriz'),
      valle: calculateFor(p => p.branch === 'Valle'),
      total: calculateFor(() => true)
    };
  }, [products]);

  const rotationStats = useMemo(() => {
    const finishedMapMatriz = new Map<string, number>();
    const finishedMapValle = new Map<string, number>();
    const entryMapMatriz = new Map<string, number>();
    const entryMapValle = new Map<string, number>();

    activityLogs.forEach(log => {
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

    return {
      finishedMatriz: formatRanking(finishedMapMatriz),
      finishedValle: formatRanking(finishedMapValle),
      entriesMatriz: formatRanking(entryMapMatriz),
      entriesValle: formatRanking(entryMapValle)
    };
  }, [activityLogs, products]);

  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    products.forEach(p => {
      const val = (p.sealedCount + p.inUseCount) * (p.unitPrice || 0);
      catMap.set(p.category, (catMap.get(p.category) || 0) + val);
    });
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const handleExportFinancialReport = async () => {
    try {
      // Filtrar solo por la sucursal seleccionada para el reporte financiero
      const snapshot = await getDocs(query(collection(db, 'inventory'), where('branch', '==', selectedBranch)));
      
      const map = new Map<string, any>();
      snapshot.docs.forEach(docSnap => {
        const p = docSnap.data() as Product;
        const key = (p.code && p.code.trim()) 
          ? p.code.trim().toUpperCase() 
          : `${(p.name || '').trim().toUpperCase()}-${(p.brand || '').trim().toUpperCase()}-${(p.unit || '').trim().toUpperCase()}-${(p.packageSize || '').trim().toUpperCase()}`;
        
        let item = map.get(key);
        if (!item) {
          item = {
            code: p.code || '---',
            name: p.name,
            brand: p.brand || '---',
            category: p.category,
            branch: p.branch,
            sealedBodega: 0,
            sealedCabina: 0,
            inUse: 0,
            finished: 0,
            unit: p.unit,
            package: p.packageSize || '---',
            price: p.unitPrice || 0,
            provider: p.commercialName || '---'
          };
          map.set(key, item);
        }
        
        if (p.location === 'BODEGA') {
          item.sealedBodega += p.sealedCount;
        } else if (p.location === 'ESTABLECIMIENTO') {
          item.sealedCabina += p.sealedCount;
          item.inUse += p.inUseCount;
          item.finished += (p.finishedCount || 0);
        }
      });

      const allData = Array.from(map.values()).map(item => ({
        ...item,
        valActivo: (item.sealedBodega + item.sealedCabina + item.inUse) * item.price,
        valConsumido: item.finished * item.price
      }));

      const settingsSnap = await getDoc(doc(db, 'inventory_config', 'settings'));
      const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
      const categories = (settingsData.categories || []).sort();
      const units = (settingsData.units || []).sort();
      const branches = ['Matriz', 'Valle'];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Reporte_Financiero_${selectedBranch.toUpperCase()}`);
      
      const refSheet = workbook.addWorksheet('RefData');
      categories.forEach((cat: string, i: number) => refSheet.getCell(`A${i + 1}`).value = cat);
      branches.forEach((b: string, i: number) => refSheet.getCell(`B${i + 1}`).value = b);
      units.forEach((u: string, i: number) => refSheet.getCell(`D${i + 1}`).value = u);
      refSheet.state = 'hidden';

      worksheet.columns = [
        { header: 'CODIGO', key: 'code', width: 12 },
        { header: 'PRODUCTO', key: 'name', width: 35 },
        { header: 'MARCA', key: 'brand', width: 20 },
        { header: 'CATEGORIA', key: 'category', width: 25 },
        { header: 'SEDE', key: 'branch', width: 15 },
        { header: 'BODEGA SELLADO', key: 'sealedBodega', width: 18 },
        { header: 'CABINA SELLADO', key: 'sealedCabina', width: 18 },
        { header: 'EN USO', key: 'inUse', width: 10 },
        { header: 'TERMINADOS', key: 'finished', width: 12 },
        { header: 'UNIDAD', key: 'unit', width: 12 },
        { header: 'PRESENTACION', key: 'package', width: 15 },
        { header: 'P_UNITARIO', key: 'price', width: 15 },
        { header: 'VALOR_ACTIVO', key: 'valActivo', width: 18 },
        { header: 'VALOR_CONSUMIDO', key: 'valConsumido', width: 18 },
        { header: 'PROVEEDOR', key: 'provider', width: 25 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      allData.forEach((item) => {
        const row = worksheet.addRow(item);
        if (categories.length > 0) {
          row.getCell('category').dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`RefData!$A$1:$A$${categories.length}`]
          };
        }
        row.getCell('branch').dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`RefData!$B$1:$B$${branches.length}`]
        };
        if (units.length > 0) {
          row.getCell('unit').dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`RefData!$D$1:$D$${units.length}`]
          };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Auditoria_Financiera_${selectedBranch}_ElaPiel_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Cargando datos financieros...</div>;

  return (
    <div className="min-h-screen w-full bg-muted/5">
      <SiteHeader />
      <main className="container py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/inventario">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase text-primary flex items-center gap-3">
                <WalletMinimal className="w-8 h-8" />
                Valorización de Inventario
              </h1>
              <p className="text-muted-foreground font-medium italic">Análisis financiero y velocidad de rotación de activos.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg shadow-sm">
              <Button variant={selectedBranch === "Matriz" ? "default" : "ghost"} onClick={() => setSelectedBranch("Matriz")} className={cn("px-3 h-9", selectedBranch === "Matriz" && "bg-pink-600")}>Matriz</Button>
              <Button variant={selectedBranch === "Valle" ? "default" : "ghost"} onClick={() => setSelectedBranch("Valle")} className={cn("px-3 h-9", selectedBranch === "Valle" && "bg-primary")}>Valle</Button>
            </div>
            <Button onClick={handleExportFinancialReport} className="bg-primary hover:bg-primary/90 font-black uppercase text-xs h-11 px-6 shadow-lg shadow-primary/20">
              <Download className="mr-2 h-4 w-4" /> Exportar Auditoría {selectedBranch} (XLSX)
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <BranchSummary 
            title="Sede Matriz" 
            stats={statsByBranch.matriz} 
            colorClass="bg-pink-600" 
            icon={Building} 
          />
          <BranchSummary 
            title="Sede Valle" 
            stats={statsByBranch.valle} 
            colorClass="bg-purple-700" 
            icon={Store} 
          />
          <BranchSummary 
            title="Consolidado Total" 
            stats={statsByBranch.total} 
            colorClass="bg-slate-800" 
            icon={Layers} 
          />
        </div>

        <Tabs defaultValue="distribution" className="w-full">
          <TabsList className="bg-white border p-1 rounded-xl h-12 w-full max-w-lg">
            <TabsTrigger value="distribution" className="rounded-lg font-bold uppercase text-xs flex-1">Distribución</TabsTrigger>
            <TabsTrigger value="rotation" className="rounded-lg font-bold uppercase text-xs flex-1">Velocidad Rotación</TabsTrigger>
            <TabsTrigger value="ranking" className="rounded-lg font-bold uppercase text-xs flex-1">Ranking Gasto</TabsTrigger>
            <TabsTrigger value="details" className="rounded-lg font-bold uppercase text-xs flex-1">Listado Valorizado</TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-primary" />
                    Inversión por Categoría
                  </CardTitle>
                  <CardDescription>Capital distribuido según el tipo de insumo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartWidget data={categoryData} height={350} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                    Comparativa Activos Líquidos
                  </CardTitle>
                  <CardDescription>Valor total en stock sellado y en uso por sucursal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartWidget 
                    data={[
                      { name: 'MATRIZ', value: statsByBranch.matriz.totalActivo },
                      { name: 'VALLE', value: statsByBranch.valle.totalActivo }
                    ]} 
                    height={350} 
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rotation" className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-red-50/50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                    <CardTitle className="text-base font-black uppercase">Consumo Rápido (Cabina)</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] uppercase font-bold">Top 10 productos más agotados</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <div>
                    <Badge className="bg-pink-600 text-white mb-4 uppercase text-[9px]">Sede Matriz</Badge>
                    <RankingList data={rotationStats.finishedMatriz} colorClass="bg-red-100 text-red-700" label="terminados" />
                  </div>
                  <Separator />
                  <div>
                    <Badge className="bg-purple-700 text-white mb-4 uppercase text-[9px]">Sede Valle</Badge>
                    <RankingList data={rotationStats.finishedValle} colorClass="bg-purple-100 text-purple-700" label="terminados" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-green-50/50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-base font-black uppercase">Reposición Rápida (Bodega)</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] uppercase font-bold">Top 10 insumos con mayor ingreso</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <div>
                    <Badge className="bg-pink-600 text-white mb-4 uppercase text-[9px]">Sede Matriz</Badge>
                    <RankingList data={rotationStats.entriesMatriz} colorClass="bg-green-100 text-green-700" label="unidades" />
                  </div>
                  <Separator />
                  <div>
                    <Badge className="bg-purple-700 text-white mb-4 uppercase text-[9px]">Sede Valle</Badge>
                    <RankingList data={rotationStats.entriesValle} colorClass="bg-blue-100 text-blue-700" label="unidades" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="pt-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Top 10 Insumos de Mayor Valor
                </CardTitle>
                <CardDescription>Productos que representan la mayor inversión económica en stock.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products
                    .map(p => ({ 
                      name: `${p.name} (${p.brand})`, 
                      value: (p.sealedCount + p.inUseCount) * (p.unitPrice || 0),
                      branch: p.branch,
                      unitInfo: `${p.unit} ${p.packageSize ? `(${p.packageSize})` : ''}`
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-8 text-center font-black text-muted-foreground">#{idx + 1}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-end mb-1">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-bold uppercase text-[11px] truncate">{item.name}</span>
                              <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-1.5 h-4", item.branch === 'Matriz' ? "border-pink-200 text-pink-600" : "border-purple-200 text-purple-700")}>
                                {item.branch}
                              </Badge>
                            </div>
                            <span className="text-[10px] font-black text-primary">${item.value.toLocaleString('en-US', { minimumFractionDigits: 3 })}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full", item.branch === 'Matriz' ? "bg-pink-600" : "bg-purple-700")} 
                              style={{ width: `${(item.value / (statsByBranch.total.totalActivo || 1)) * 100 * 3}%` }} 
                            />
                          </div>
                          <p className="text-[8px] font-black text-muted-foreground mt-1 uppercase">{item.unitInfo}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
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
                        <TableHead className="font-black uppercase text-[10px] text-center">Sede/Loc</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-center">U. Selladas</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-center">U. Uso</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-right">P. Unitario</TableHead>
                        <TableHead className="font-black uppercase text-[10px] text-right">Valorización</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((p) => {
                          const activeVal = (p.sealedCount + p.inUseCount) * (p.unitPrice || 0);
                          return (
                            <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-black uppercase text-xs">{p.name}</span>
                                  <span className="text-[9px] text-muted-foreground font-bold">{p.code || 'SIN COD'} | {p.brand}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={cn("text-[9px] font-black uppercase px-2", p.branch === 'Matriz' ? "bg-pink-600" : "bg-purple-700")}>
                                  {p.branch?.charAt(0) || '?'} - {p.location === 'BODEGA' ? 'B' : 'C'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-black text-xs">{p.sealedCount}</span>
                                  <span className="text-[8px] text-muted-foreground font-bold uppercase">{p.unit}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-xs text-primary">{p.inUseCount}</span>
                                  <span className="text-[8px] text-primary/60 font-bold uppercase">{p.unit}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-xs">${(p.unitPrice || 0).toFixed(3)}</TableCell>
                              <TableCell className="text-right font-black text-xs text-primary">${activeVal.toLocaleString('en-US', { minimumFractionDigits: 3 })}</TableCell>
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
