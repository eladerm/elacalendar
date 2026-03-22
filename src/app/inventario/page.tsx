
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  increment,
  writeBatch,
  getDocs,
  getDoc,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { 
  Package, 
  Search, 
  Plus, 
  Building, 
  Store, 
  Trash2, 
  Pencil,
  History,
  Settings,
  Truck,
  Loader2,
  Wrench,
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  WalletMinimal,
  BarChart3,
  Eraser,
  FileSpreadsheet,
  Camera,
  X,
  Download
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { ProductActivityDialog } from '@/components/product-activity-dialog';
import { ProductIssuesDialog } from '@/components/product-issues-dialog';
import { InventorySettingsDialog } from '@/components/inventory-settings-dialog';
import { DeliveryFormDialog } from '@/components/delivery-form-dialog';
import { InventoryImportDialog } from '@/components/inventory-import-dialog';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ConsolidatedVariant {
  key: string;
  name: string;
  brand: string;
  code: string;
  unit: string;
  packageSize: string;
  category: string;
  observations: string;
  minStock: number;
  bodegaDoc: Product | null;
  cabinaDoc: Product | null;
  sealedBodega: number;
  sealedCabina: number;
  inUseCount: number;
  finishedCount: number;
  issueCount: number;
  totalStock: number;
  imageUrl?: string;
}

interface GroupedProduct {
  name: string;
  variants: ConsolidatedVariant[];
  totalSealedBodega: number;
  totalSealedCabina: number;
  totalInUse: number;
  totalFinished: number;
  totalIssues: number;
}

export default function InventarioPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<'Matriz' | 'Valle'>('Matriz');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForActivity, setSelectedProductForActivity] = useState<{ name: string, ids: string[] } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [transferDirection, setTransferDirection] = useState<'to_cabina' | 'to_bodega'>('to_cabina');
  const [transferQuantity, setTransferQuantity] = useState<string>('1');
  const [isTransferring, setIsTransfering] = useState(false);
  const [hasTransferIssues, setHasTransferIssues] = useState<'no' | 'si'>('no');
  const [transferIssueNotes, setTransferIssueNotes] = useState('');

  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [finishVariant, setFinishVariant] = useState<ConsolidatedVariant | null>(null);
  const [finishDescription, setFinishDescription] = useState('');
  const [finishQuantity, setFinishQuantity] = useState<string>('1');
  const [isFinishing, setIsFinishing] = useState(false);

  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [openVariant, setOpenVariant] = useState<ConsolidatedVariant | null>(null);
  const [openQuantity, setOpenQuantity] = useState<string>('1');
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (user?.branch) {
      setSelectedBranch(user.branch);
    }
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, 'inventory'), 
      where('branch', '==', selectedBranch)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
    });
    return () => unsubscribe();
  }, [selectedBranch]);

  const filteredProducts = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(queryStr) || 
      p.category.toLowerCase().includes(queryStr) ||
      (p.brand || '').toLowerCase().includes(queryStr) ||
      (p.code || '').toLowerCase().includes(queryStr)
    );
  }, [products, searchQuery]);

  const consolidatedList = useMemo(() => {
    const map = new Map<string, ConsolidatedVariant>();
    
    filteredProducts.forEach(p => {
      const variantKey = (p.code && p.code.trim()) 
        ? p.code.trim().toUpperCase() 
        : `${(p.name || '').trim().toUpperCase()}-${(p.brand || '').trim().toUpperCase()}-${(p.unit || '').trim().toUpperCase()}-${(p.packageSize || '').trim().toUpperCase()}`;
      
      let existing = map.get(variantKey);
      
      if (existing) {
        if (p.location === 'BODEGA') {
          existing.bodegaDoc = p;
          existing.sealedBodega += p.sealedCount;
        } else if (p.location === 'ESTABLECIMIENTO') {
          existing.cabinaDoc = p;
          existing.sealedCabina += p.sealedCount;
          existing.inUseCount += p.inUseCount;
          existing.finishedCount += (p.finishedCount || 0);
        }
        existing.issueCount += (p.issueCount || 0);
        existing.totalStock = existing.sealedBodega + existing.sealedCabina + existing.inUseCount;
        if (!existing.imageUrl && p.imageUrl) existing.imageUrl = p.imageUrl;
      } else {
        map.set(variantKey, {
          key: variantKey,
          name: p.name,
          brand: (p.brand || '').trim().toUpperCase(),
          code: (p.code || '').trim().toUpperCase(),
          unit: (p.unit || '').trim().toUpperCase(),
          packageSize: (p.packageSize || '').trim().toUpperCase(),
          category: p.category,
          observations: p.observations || '',
          minStock: p.minStock,
          bodegaDoc: p.location === 'BODEGA' ? p : null,
          cabinaDoc: p.location === 'ESTABLECIMIENTO' ? p : null,
          sealedBodega: p.location === 'BODEGA' ? p.sealedCount : 0,
          sealedCabina: p.location === 'ESTABLECIMIENTO' ? p.sealedCount : 0,
          inUseCount: p.location === 'ESTABLECIMIENTO' ? p.inUseCount : 0,
          finishedCount: p.location === 'ESTABLECIMIENTO' ? (p.finishedCount || 0) : 0,
          issueCount: p.issueCount || 0,
          totalStock: p.sealedCount + (p.location === 'ESTABLECIMIENTO' ? p.inUseCount : 0),
          imageUrl: p.imageUrl
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredProducts]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>();
    
    consolidatedList.forEach(variant => {
      const name = variant.name.toUpperCase().trim();
      let group = map.get(name);
      if (!group) {
        group = {
          name,
          variants: [],
          totalSealedBodega: 0,
          totalSealedCabina: 0,
          totalInUse: 0,
          totalFinished: 0,
          totalIssues: 0
        };
        map.set(name, group);
      }
      group.variants.push(variant);
      group.totalSealedBodega += variant.sealedBodega;
      group.totalSealedCabina += variant.sealedCabina;
      group.totalInUse += variant.inUseCount;
      group.totalFinished += variant.finishedCount;
      group.totalIssues += variant.issueCount;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [consolidatedList]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleExportAllInventory = async () => {
    const isAdminUser = user?.role === 'administrador';
    if (!isAdminUser || isExporting) return;
    setIsExporting(true);
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      const allData = snapshot.docs.map(docSnap => {
        const p = docSnap.data() as Product;
        return {
          code: p.code || '---',
          name: p.name,
          brand: p.brand || 'GENÉRICO',
          category: p.category,
          branch: p.branch,
          location: p.location,
          sealed: p.sealedCount,
          inUse: p.inUseCount,
          finished: p.finishedCount || 0,
          unit: p.unit,
          package: p.packageSize || '---',
          price: p.unitPrice || 0,
          min: p.minStock || 1,
          provider: p.commercialName || '---',
          phone: p.distributorPhone || '---',
          obs: p.observations || ''
        };
      });

      const settingsSnap = await getDoc(doc(db, 'inventory_config', 'settings'));
      const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
      const categories = (settingsData.categories || []).sort();
      const units = (settingsData.units || []).sort();
      const branches = ['Matriz', 'Valle'];
      const locations = ['BODEGA', 'ESTABLECIMIENTO'];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('INVENTARIO_ELAPIEL');
      
      const refSheet = workbook.addWorksheet('RefData');
      categories.forEach((cat: string, i: number) => refSheet.getCell(`A${i + 1}`).value = cat);
      branches.forEach((b: string, i: number) => refSheet.getCell(`B${i + 1}`).value = b);
      locations.forEach((l: string, i: number) => refSheet.getCell(`C${i + 1}`).value = l);
      units.forEach((u: string, i: number) => refSheet.getCell(`D${i + 1}`).value = u);
      refSheet.state = 'hidden';

      worksheet.columns = [
        { header: 'CODIGO', key: 'code', width: 12 },
        { header: 'PRODUCTO', key: 'name', width: 35 },
        { header: 'MARCA', key: 'brand', width: 20 },
        { header: 'CATEGORIA', key: 'category', width: 25 },
        { header: 'SEDE', key: 'branch', width: 15 },
        { header: 'UBICACION', key: 'location', width: 20 },
        { header: 'STOCK_SELLADO', key: 'sealed', width: 15 },
        { header: 'EN_USO', key: 'inUse', width: 10 },
        { header: 'TERMINADOS', key: 'finished', width: 12 },
        { header: 'UNIDAD', key: 'unit', width: 12 },
        { header: 'PRESENTACION', key: 'package', width: 15 },
        { header: 'PRECIO_UNITARIO', key: 'price', width: 15 },
        { header: 'STOCK_MINIMO', key: 'min', width: 15 },
        { header: 'PROVEEDOR', key: 'provider', width: 25 },
        { header: 'TELEFONO', key: 'phone', width: 15 },
        { header: 'OBSERVACIONES', key: 'obs', width: 40 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDB2777' } };

      allData.forEach((item, idx) => {
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
        row.getCell('location').dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`RefData!$C$1:$C$${locations.length}`]
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
      saveAs(new Blob([buffer]), `Inventario_Completo_ElaPiel_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Exportación Exitosa", description: `${allData.length} registros exportados.` });
    } catch (e) {
      console.error("Error exportando:", e);
      toast({ title: "Error al exportar", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllInventory = () => {
    const isAdminUser = user?.role === 'administrador';
    if (!isAdminUser || !user || isDeletingAll) return;
    
    setIsDeletingAll(true);
    getDocs(query(collection(db, 'inventory'))).then((snapshot) => {
      if (snapshot.empty) {
        toast({ title: "Inventario ya está vacío" });
        setIsDeleteAllOpen(false);
        setIsDeletingAll(false);
        return;
      }

      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      batch.commit().then(() => {
        addDoc(collection(db, 'activity_log'), {
          userId: user.id,
          userName: user.name,
          action: `ELIMINÓ TODO EL INVENTARIO (${snapshot.size} ítems).`,
          timestamp: Timestamp.now()
        });
        toast({ title: "Inventario Vaciado", description: `Se eliminaron ${snapshot.size} registros.` });
      }).catch((err) => {
        toast({ title: "Error al vaciar inventario", variant: "destructive" });
      }).finally(() => {
        setIsDeletingAll(false);
        setIsDeleteAllOpen(false);
      });
    }).catch((e) => {
      toast({ title: "Error al consultar inventario", variant: "destructive" });
      setIsDeletingAll(false);
      setIsDeleteAllOpen(false);
    });
  };

  const handleTransferStock = async () => {
    if (!transferProduct || !user || isTransferring) return;
    const qty = parseInt(transferQuantity);
    if (isNaN(qty) || qty <= 0 || qty > transferProduct.sealedCount) {
      toast({ title: "Cantidad inválida", variant: "destructive" });
      return;
    }

    if (hasTransferIssues === 'si' && !transferIssueNotes.trim()) {
      toast({ title: "Observación obligatoria", description: "Debes detallar la novedad encontrada.", variant: "destructive" });
      return;
    }

    setIsTransfering(true);
    const targetLocation = transferDirection === 'to_cabina' ? 'ESTABLECIMIENTO' : 'BODEGA';

    try {
      const qTarget = query(
        collection(db, "inventory"),
        where('name', '==', transferProduct.name),
        where('brand', '==', transferProduct.brand || ''),
        where('unit', '==', transferProduct.unit),
        where('branch', '==', transferProduct.branch),
        where('location', '==', targetLocation),
        limit(1)
      );
      
      const targetSnap = await getDocs(qTarget);
      const targetId = targetSnap.empty ? null : targetSnap.docs[0].id;

      await runTransaction(db, async (transaction) => {
        const sourceRef = doc(db, 'inventory', transferProduct.id);
        transaction.update(sourceRef, { sealedCount: increment(-qty), lastUpdated: Timestamp.now() });

        if (targetId) {
          const targetRef = doc(db, "inventory", targetId);
          const updateData: any = { sealedCount: increment(qty), lastUpdated: Timestamp.now() };
          if (hasTransferIssues === 'si') updateData.issueCount = increment(1);
          transaction.update(targetRef, updateData);
        } else {
          const newRef = doc(collection(db, "inventory"));
          const { id, lastUpdated, ...dataToCopy } = transferProduct;
          transaction.set(newRef, { 
            ...dataToCopy, 
            location: targetLocation, 
            sealedCount: qty, 
            inUseCount: 0, 
            finishedCount: 0, 
            issueCount: hasTransferIssues === 'si' ? 1 : 0,
            lastUpdated: Timestamp.now() 
          });
        }

        const logRef = doc(collection(db, "activity_log"));
        const issuesText = hasTransferIssues === 'si' ? ` NOVEDAD: ${transferIssueNotes.trim()}` : '';
        const logAction = transferDirection === 'to_cabina' 
          ? `Movió por: ${user.name}. Envió ${qty} de "${transferProduct.name}" a CABINA.${issuesText}` 
          : `Movió por: ${user.name}. Regresó ${qty} de "${transferProduct.name}" a BODEGA.${issuesText}`;

        transaction.set(logRef, {
          userId: user.id, userName: user.name, 
          action: logAction,
          timestamp: Timestamp.now(), productId: transferProduct.id
        });
      });

      toast({ title: "Transferencia Realizada" });
      setIsTransferOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsTransfering(false);
    }
  };

  const handleOpenProduct = (variant: ConsolidatedVariant) => {
    if (variant.cabinaDoc && variant.sealedCabina > 0) {
      setOpenVariant(variant);
      setOpenQuantity('1');
      setIsOpenDialogOpen(true);
    } else {
      toast({ 
        title: "Stock de Cabina Agotado", 
        description: "NO DISPONIBLE EN STOCK DE CABINA. FAVOR SAQUE DE BODEGA.", 
        variant: "destructive" 
      });
    }
  };

  const handleConfirmOpen = async () => {
    if (!openVariant?.cabinaDoc || !user || isOpening) return;
    const qty = parseInt(openQuantity);
    if (isNaN(qty) || qty <= 0 || qty > openVariant.sealedCabina) {
      toast({ title: "Cantidad inválida", variant: "destructive" });
      return;
    }

    setIsOpening(true);
    try {
      await updateDoc(doc(db, 'inventory', openVariant.cabinaDoc.id), {
        sealedCount: increment(-qty), 
        inUseCount: increment(qty), 
        lastUpdated: Timestamp.now()
      });
      await addDoc(collection(db, 'activity_log'), {
        userId: user.id, 
        userName: user.name, 
        action: `Abrió por: ${user.name}. ${qty} unidad(es) de "${openVariant.name}" en cabina.`, 
        timestamp: Timestamp.now(), 
        productId: openVariant.cabinaDoc.id,
      });
      toast({ title: "Unidades Abiertas" });
      setIsOpenDialogOpen(false);
      setOpenQuantity('1');
      setOpenVariant(null);
    } catch (e) { 
      toast({ title: "Error", variant: "destructive" }); 
    } finally {
      setIsOpening(false);
    }
  };

  const handleConfirmFinish = async () => {
    if (!finishVariant?.cabinaDoc || !user || isFinishing) return;
    const qty = parseInt(finishQuantity);
    if (isNaN(qty) || qty <= 0 || qty > finishVariant.inUseCount) {
      toast({ title: "Cantidad inválida", variant: "destructive" });
      return;
    }
    if (!finishDescription.trim()) {
      toast({ title: "Descripción obligatoria", description: "Debes detallar el motivo para terminar el producto.", variant: "destructive" });
      return;
    }

    setIsFinishing(true);
    try {
      await updateDoc(doc(db, 'inventory', finishVariant.cabinaDoc.id), {
        inUseCount: increment(-qty), 
        finishedCount: increment(qty), 
        lastUpdated: Timestamp.now()
      });
      await addDoc(collection(db, 'activity_log'), {
        userId: user.id, 
        userName: user.name, 
        action: `Terminó por: ${user.name}. ${qty} unidad(es) de "${finishVariant.name}" en cabina. Motivo: ${finishDescription.trim()}`, 
        timestamp: Timestamp.now(), 
        productId: finishVariant.cabinaDoc.id,
      });
      toast({ title: "Unidades Terminadas" });
      setIsFinishDialogOpen(false);
      setFinishDescription('');
      setFinishQuantity('1');
      setFinishVariant(null);
    } catch (e) { 
      toast({ title: "Error", variant: "destructive" }); 
    } finally {
      setIsFinishing(false);
    }
  };

  const isAdminUser = user?.role === 'administrador';
  const branchColor = selectedBranch === 'Matriz' ? 'text-pink-600' : 'text-primary';
  const branchBg = selectedBranch === 'Matriz' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-primary hover:bg-primary/90';

  return (
    <div className="min-h-screen w-full bg-muted/5">
      <SiteHeader />
      <main className="container py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className={cn("text-3xl font-black tracking-tight uppercase", branchColor)}>
              Inventario: {selectedBranch}
            </h1>
            <p className="text-muted-foreground font-medium">Gestión de stock agrupada por insumo.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg shadow-sm mr-2">
              <Button variant={selectedBranch === "Matriz" ? "default" : "ghost"} onClick={() => setSelectedBranch("Matriz")} className={cn("gap-2 px-3 h-9", selectedBranch === "Matriz" && "bg-pink-600")}>
                <Building className="w-4 h-4" /> Matriz
              </Button>
              <Button variant={selectedBranch === "Valle" ? "default" : "ghost"} onClick={() => setSelectedBranch("Valle")} className={cn("gap-2 px-3 h-9", selectedBranch === "Valle" && "bg-primary")}>
                <Store className="w-4 h-4" /> Valle
              </Button>
            </div>

            {isAdminUser && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { setIsDeliveryOpen(true); }} className="h-9 gap-2 border-blue-200 text-blue-700 font-bold">
                  <Truck className="h-4 w-4" /> Entrega
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 gap-2 border-orange-200 text-orange-700 font-bold">
                      <Settings className="h-4 w-4" /> Gestionar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem asChild><Link href="/inventario/finanzas"><WalletMinimal className="mr-2 h-4 w-4" /> Control Financiero</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/inventario/estadisticas"><BarChart3 className="mr-2 h-4 w-4" /> Ver Estadísticas</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportAllInventory} disabled={isExporting}>
                      {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Exportar Inventario (XLSX)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar Masivamente (Excel)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}><Wrench className="mr-2 h-4 w-4" /> Configurar Categorías</DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/inventario/entregas"><Truck className="mr-2 h-4 w-4" /> Ver Historial Entregas</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive font-black uppercase text-[10px]" onClick={() => setIsDeleteAllOpen(true)}>
                      <Eraser className="mr-2 h-4 w-4" /> Vaciar Inventario
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }} className={cn("font-bold text-white shadow-lg", branchBg)}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Insumo
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, código o marca..." className="pl-10 h-11 bg-muted/30 border-none shadow-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <TooltipProvider>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 text-center font-black uppercase text-[11px]"></TableHead>
                  <TableHead className="font-black uppercase text-[11px] tracking-wider py-4">Insumo / Variante</TableHead>
                  <TableHead className="font-black uppercase text-[11px] tracking-wider text-center">Código</TableHead>
                  <TableHead className="font-black uppercase text-[11px] tracking-wider text-center">Bodega (Sellado)</TableHead>
                  <TableHead className="font-black uppercase text-[11px] tracking-wider text-center">Cabina (Sellado)</TableHead>
                  <TableHead className="font-black uppercase text-[11px] tracking-wider text-center">Gestión de Consumo</TableHead>
                  <TableHead className="font-black uppercase text-[11px] tracking-wider text-center pr-8">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedItems.length > 0 ? groupedItems.map((group) => {
                  const isExpanded = expandedGroups.has(group.name);
                  const hasMultipleVariants = group.variants.length > 1;
                  const firstVariant = group.variants[0];
                  const canOpenGroup = (firstVariant.sealedCabina + firstVariant.sealedBodega) > 0;

                  return (
                    <React.Fragment key={group.name}>
                      <TableRow className={cn("transition-colors", hasMultipleVariants ? "bg-muted/10 font-bold" : "")}>
                        <TableCell className="text-center">
                          {hasMultipleVariants ? (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleGroup(group.name)}>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          ) : <Layers className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className={cn(
                                "h-10 w-10 rounded-md border shadow-sm shrink-0 transition-transform",
                                firstVariant.imageUrl && "cursor-pointer hover:scale-110"
                              )}
                              onClick={() => firstVariant.imageUrl && setPreviewImage(firstVariant.imageUrl)}
                            >
                              <AvatarImage src={firstVariant.imageUrl} className="object-cover" />
                              <AvatarFallback className="bg-muted text-muted-foreground rounded-md text-[8px] font-black">
                                <Camera className="w-6 h-6 opacity-20" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-black uppercase text-sm">{group.name}</span>
                              {hasMultipleVariants ? (
                                <span className="text-[9px] text-primary font-bold uppercase tracking-tight">
                                  {group.variants.length} VARIANTES DISPONIBLES
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">
                                  MARCA: {firstVariant.brand} | {firstVariant.unit} {firstVariant.packageSize}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center text-xs font-bold text-muted-foreground">
                          {hasMultipleVariants ? '---' : firstVariant.code}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center min-w-[120px]">
                            <div className="flex items-center justify-center gap-3">
                              <span className={cn("text-2xl font-black", group.totalSealedBodega === 0 ? "text-slate-300" : "text-foreground")}>
                                {group.totalSealedBodega}
                              </span>
                              {!hasMultipleVariants && firstVariant.bodegaDoc && group.totalSealedBodega > 0 && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => { 
                                  setTransferProduct(firstVariant.bodegaDoc); 
                                  setTransferDirection('to_cabina'); 
                                  setHasTransferIssues('no');
                                  setTransferIssueNotes('');
                                  setIsTransferOpen(true); 
                                }}>
                                  <ArrowRight className="h-5 w-5" />
                                </Button>
                              )}
                            </div>
                            {!hasMultipleVariants && (
                              <span className="text-[9px] font-black text-muted-foreground uppercase leading-tight mt-1 text-center">
                                {firstVariant.unit} <br/> {firstVariant.packageSize && `(${firstVariant.packageSize})`}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center min-w-[120px]">
                            <div className="flex items-center justify-center gap-3">
                              {!hasMultipleVariants && firstVariant.cabinaDoc && group.totalSealedCabina > 0 && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600 hover:bg-orange-50" onClick={() => { 
                                  setTransferProduct(firstVariant.cabinaDoc); 
                                  setTransferDirection('to_bodega'); 
                                  setHasTransferIssues('no');
                                  setTransferIssueNotes('');
                                  setIsTransferOpen(true); 
                                }}>
                                  <ArrowLeft className="h-5 w-5" />
                                </Button>
                              )}
                              <span className={cn("text-2xl font-black", group.totalSealedCabina === 0 ? "text-slate-300" : "text-foreground")}>
                                {group.totalSealedCabina}
                              </span>
                            </div>
                            {!hasMultipleVariants && (
                              <span className="text-[9px] font-black text-muted-foreground uppercase leading-tight mt-1 text-center">
                                {firstVariant.unit} <br/> {firstVariant.packageSize && `(${firstVariant.packageSize})`}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center min-w-[200px]">
                            <div className="flex items-center justify-center gap-6">
                              <div className="flex flex-col items-center min-w-[60px]">
                                <span className={cn("text-2xl font-black", group.totalInUse > 0 ? "text-primary" : "text-slate-300")}>{group.totalInUse}</span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground">En Uso</span>
                              </div>

                              <div className="flex flex-col items-center min-w-[80px]">
                                <span className={cn("text-2xl font-black", group.totalFinished > 0 ? "text-slate-800" : "text-slate-300")}>{group.totalFinished}</span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground">Terminados</span>
                              </div>
                            </div>
                            {!hasMultipleVariants && (
                              <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mt-2">
                                {firstVariant.unit} {firstVariant.packageSize && `(${firstVariant.packageSize})`}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-3">
                            {!hasMultipleVariants && (
                              <div className="flex flex-col gap-1 w-24">
                                <Button size="sm" variant="outline" disabled={!canOpenGroup} onClick={() => handleOpenProduct(firstVariant)} className="h-7 px-2 text-[10px] font-black uppercase border-primary/20 text-primary hover:bg-primary/5">Abrir</Button>
                                <Button size="sm" variant="outline" disabled={group.totalInUse === 0} onClick={() => { setFinishVariant(firstVariant); setFinishQuantity('1'); setIsFinishDialogOpen(true); }} className="h-7 px-2 text-[10px] font-black uppercase border-slate-300 text-slate-700">Terminar</Button>
                                {group.totalIssues > 0 && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => {
                                      setSelectedProductForActivity({ 
                                        name: group.name, 
                                        ids: group.variants.flatMap(v => [v.cabinaDoc?.id, v.bodegaDoc?.id].filter((id): id is string => !!id))
                                      }); 
                                      setIsIssuesOpen(true);
                                    }} 
                                    className="h-7 px-2 text-[10px] font-black uppercase bg-red-600 hover:bg-red-700"
                                  >
                                    Novedades
                                  </Button>
                                )}
                              </div>
                            )}
                            {!hasMultipleVariants ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenProduct(firstVariant)} disabled={!canOpenGroup}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> Abrir Unidades
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setFinishVariant(firstVariant); setFinishQuantity('1'); setIsFinishDialogOpen(true); }} disabled={firstVariant.inUseCount === 0}>
                                    <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Terminar Unidades
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { 
                                    setSelectedProductForActivity({ 
                                      name: group.name, 
                                      ids: [firstVariant.cabinaDoc?.id, firstVariant.bodegaDoc?.id].filter((id): id is string => !!id)
                                    }); 
                                    setIsActivityOpen(true); 
                                  }}>
                                    <History className="mr-2 h-4 w-4" /> Historial
                                  </DropdownMenuItem>
                                  {isAdminUser && (
                                    <>
                                      <DropdownMenuItem onClick={() => { setEditingProduct(firstVariant.bodegaDoc || firstVariant.cabinaDoc!); setIsFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive font-bold" onClick={() => {
                                        const batch = writeBatch(db);
                                        if (firstVariant.bodegaDoc) batch.delete(doc(db, 'inventory', firstVariant.bodegaDoc.id));
                                        if (firstVariant.cabinaDoc) batch.delete(doc(db, 'inventory', firstVariant.cabinaDoc.id));
                                        batch.commit().then(() => toast({ title: "Producto eliminado" }));
                                      }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => toggleGroup(group.name)} className="text-[10px] font-black uppercase">
                                {isExpanded ? 'Cerrar' : 'Ver Detalles'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {hasMultipleVariants && isExpanded && group.variants.map((variant) => (
                        <TableRow key={variant.key} className="bg-muted/5 border-l-4 border-l-primary/40 hover:bg-muted/10 transition-colors">
                          <TableCell></TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3 pl-4">
                              <Avatar 
                                className={cn(
                                  "h-8 w-8 rounded-md border shrink-0 transition-transform",
                                  variant.imageUrl && "cursor-pointer hover:scale-110"
                                )}
                                onClick={() => variant.imageUrl && setPreviewImage(variant.imageUrl)}
                              >
                                <AvatarImage src={variant.imageUrl} className="object-cover" />
                                <AvatarFallback className="bg-muted text-[6px] font-black uppercase">
                                  <Camera className="w-3 h-3 opacity-20" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-bold uppercase text-xs text-muted-foreground">Variante</span>
                                <span className="font-black uppercase text-[11px]">{variant.brand} | {variant.unit} {variant.packageSize}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold text-muted-foreground">{variant.code || '---'}</TableCell>
                          
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center justify-center min-w-[120px]">
                              <div className="flex items-center justify-center gap-3">
                                <span className={cn("text-2xl font-black", variant.sealedBodega === 0 ? "text-slate-300" : "text-foreground")}>{variant.sealedBodega}</span>
                                {variant.bodegaDoc && variant.sealedBodega > 0 && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => { 
                                    setTransferProduct(variant.bodegaDoc); 
                                    setTransferDirection('to_cabina'); 
                                    setHasTransferIssues('no');
                                    setTransferIssueNotes('');
                                    setIsTransferOpen(true); 
                                  }}>
                                    <ArrowRight className="h-5 w-5" />
                                  </Button>
                                )}
                              </div>
                              <span className="text-[9px] font-black text-muted-foreground uppercase leading-tight mt-1 text-center">
                                {variant.unit} <br/> {variant.packageSize && `(${variant.packageSize})`}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center justify-center min-w-[120px]">
                              <div className="flex items-center justify-center gap-3">
                                {variant.cabinaDoc && variant.sealedCabina > 0 && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600 hover:bg-orange-50" onClick={() => { 
                                    setTransferProduct(variant.cabinaDoc); 
                                    setTransferDirection('to_bodega'); 
                                    setHasTransferIssues('no');
                                    setTransferIssueNotes('');
                                    setIsTransferOpen(true); 
                                  }}>
                                    <ArrowLeft className="h-5 w-5" />
                                  </Button>
                                )}
                                <span className={cn("text-2xl font-black", variant.sealedCabina === 0 ? "text-slate-300" : "text-foreground")}>{variant.sealedCabina}</span>
                              </div>
                              <span className="text-[9px] font-black text-muted-foreground uppercase leading-tight mt-1 text-center">
                                {variant.unit} <br/> {variant.packageSize && `(${variant.packageSize})`}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center justify-center min-w-[200px]">
                              <div className="flex items-center justify-center gap-6">
                                <div className="flex flex-col items-center min-w-[60px]">
                                  <span className={cn("text-2xl font-black", variant.inUseCount > 0 ? "text-primary" : "text-slate-300")}>{variant.inUseCount}</span>
                                  <span className="text-[9px] font-black uppercase text-muted-foreground">En Uso</span>
                                </div>
                                <div className="flex flex-col items-center min-w-[80px]">
                                  <span className={cn("text-2xl font-black", variant.finishedCount > 0 ? "text-slate-800" : "text-slate-300")}>{variant.finishedCount}</span>
                                  <span className="text-[9px] font-black uppercase text-muted-foreground">Terminados</span>
                                </div>
                              </div>
                              <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mt-2">
                                {variant.unit} {variant.packageSize && `(${variant.packageSize})`}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-3">
                              <div className="flex flex-col gap-1 w-24">
                                <Button size="sm" variant="outline" disabled={(variant.sealedCabina + variant.sealedBodega) === 0} onClick={() => handleOpenProduct(variant)} className="h-7 px-2 text-[10px] font-black uppercase border-primary/20 text-primary hover:bg-primary/5">Abrir</Button>
                                <Button size="sm" variant="outline" disabled={variant.inUseCount === 0} onClick={() => { setFinishVariant(variant); setFinishQuantity('1'); setIsFinishDialogOpen(true); }} className="h-7 px-2 text-[10px] font-black uppercase border-slate-300 text-slate-700">Terminar</Button>
                                {variant.issueCount > 0 && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => {
                                      setSelectedProductForActivity({ 
                                        name: variant.name + " (" + variant.brand + ")", 
                                        ids: [variant.cabinaDoc?.id, variant.bodegaDoc?.id].filter((id): id is string => !!id)
                                      }); 
                                      setIsIssuesOpen(true);
                                    }} 
                                    className="h-7 px-2 text-[10px] font-black uppercase bg-red-600 hover:bg-red-700"
                                  >
                                    Novedades
                                  </Button>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { 
                                    setSelectedProductForActivity({ 
                                      name: variant.name, 
                                      ids: [variant.cabinaDoc?.id, variant.bodegaDoc?.id].filter((id): id is string => !!id)
                                    }); 
                                    setIsActivityOpen(true); 
                                  }}>
                                    <History className="mr-2 h-4 w-4" /> Historial
                                  </DropdownMenuItem>
                                  {isAdminUser && (
                                    <>
                                      <DropdownMenuItem onClick={() => { setEditingProduct(variant.bodegaDoc || variant.cabinaDoc!); setIsFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive font-bold" onClick={() => {
                                        const batch = writeBatch(db);
                                        if (variant.bodegaDoc) batch.delete(doc(db, 'inventory', variant.bodegaDoc.id));
                                        if (variant.cabinaDoc) batch.delete(doc(db, 'inventory', variant.cabinaDoc.id));
                                        batch.commit().then(() => toast({ title: "Producto eliminado" }));
                                      }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No hay registros en el inventario actual.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </main>

      <Dialog open={isTransferOpen} onOpenChange={isTransferOpen => !isTransferOpen && setIsTransferOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-black flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" /> {transferDirection === 'to_cabina' ? 'Enviar a Cabina' : 'Regresar a Bodega'}
            </DialogTitle>
            <DialogDescription className="font-bold uppercase pt-2">"{transferProduct?.name}" ({transferProduct?.brand})</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase">Cantidad a Mover</Label>
              <Input type="number" min="1" max={transferProduct?.sealedCount} value={transferQuantity} onChange={(e) => setTransferQuantity(e.target.value)} className="text-2xl font-black h-14 text-center" />
              <p className="text-[10px] text-muted-foreground uppercase text-center">
                Disponible actualmente: {transferProduct?.sealedCount} {transferProduct?.unit}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-black text-xs uppercase text-primary">¿Tuvo novedades con el producto?</Label>
                <RadioGroup 
                  value={hasTransferIssues} 
                  onValueChange={(val: 'no' | 'si') => setHasTransferIssues(val)}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="issue-no" />
                    <Label htmlFor="issue-no" className="font-bold text-xs uppercase cursor-pointer">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="si" id="issue-si" />
                    <Label htmlFor="issue-si" className="font-bold text-xs uppercase cursor-pointer">Sí</Label>
                  </div>
                </RadioGroup>
              </div>

              {hasTransferIssues === 'si' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Observación / Detalle de la Novedad</Label>
                  <Textarea 
                    placeholder="Ej. El empaque llegó abierto, tiene abolladuras..."
                    className="resize-none h-20 text-xs"
                    value={transferIssueNotes}
                    onChange={(e) => setTransferIssueNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
            <Button 
              disabled={isTransferring} 
              onClick={handleTransferStock} 
              className={cn("font-black uppercase", transferDirection === 'to_cabina' ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700")}
            >
              {isTransferring && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-black text-primary flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> ¿Cuántas unidades desea abrir?
            </DialogTitle>
            <DialogDescription className="font-bold uppercase pt-2">
              "{openVariant?.name}" ({openVariant?.brand})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-primary font-medium">
              Esta acción reducirá el stock <strong>Sellado</strong> en Cabina y lo pasará a <strong>En Uso</strong>.
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase">Cantidad a Abrir</Label>
              <Input 
                type="number" 
                min="1" 
                max={openVariant?.sealedCabina} 
                value={openQuantity} 
                onChange={(e) => setOpenQuantity(e.target.value)} 
                className="text-2xl font-black h-14 text-center border-primary/20" 
              />
              <p className="text-[10px] text-muted-foreground uppercase text-center font-bold">
                Sellado disponible en Cabina: {openVariant?.sealedCabina} {openVariant?.unit}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>Cancelar</Button>
            <Button 
              disabled={isOpening} 
              onClick={handleConfirmOpen} 
              className="font-black uppercase bg-primary text-white"
            >
              {isOpening && <Loader2 className="mr-2 h-4 w-4" />} Confirmar Apertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-black text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> ¿Terminar Unidades en Cabina?
            </DialogTitle>
            <DialogDescription className="font-bold uppercase pt-2">
              "{finishVariant?.name}" ({finishVariant?.brand})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 font-medium">
              Esta acción reducirá el contador de <strong>En Uso</strong> y lo marcará como <strong>Terminado</strong>.
            </div>
            
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase">Cantidad a Terminar</Label>
              <Input 
                type="number" 
                min="1" 
                max={finishVariant?.inUseCount} 
                value={finishQuantity} 
                onChange={(e) => setFinishQuantity(e.target.value)} 
                className="text-2xl font-black h-14 text-center border-destructive/20" 
              />
              <p className="text-[10px] text-muted-foreground uppercase text-center font-bold">
                Actualmente en uso: {finishVariant?.inUseCount} {finishVariant?.unit}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase text-muted-foreground">Descripción / Motivo (Obligatorio)</Label>
              <Textarea 
                placeholder="Ej. Se terminó contenido completo de la unidad..." 
                className="resize-none h-24"
                value={finishDescription}
                onChange={(e) => setFinishDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinishDialogOpen(false)}>Cancelar</Button>
            <Button 
              disabled={isFinishing || !finishDescription.trim()} 
              onClick={handleConfirmFinish} 
              variant="destructive"
              className="font-black uppercase"
            >
              {isFinishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar y Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 uppercase font-black">
              <Eraser className="w-6 h-6" /> ¿Vaciar todo el inventario?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2 font-bold text-foreground">
              Esta acción eliminará <span className="text-destructive underline">TODOS</span> los productos registrados en ambas sedes (Matriz y Valle). 
              <br/><br/>
              Esta operación es irreversible y se registrará en la bitácora de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteAllInventory(); }} 
              disabled={isDeletingAll}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black uppercase"
            >
              {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Sí, Borrar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden border-none bg-black/90 shadow-none">
          <div className="relative flex items-center justify-center w-full min-h-[300px] p-4">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Vista previa del producto" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
              />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10 backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isFormOpen && <ProductFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} initialData={editingProduct} branch={selectedBranch} />}
      {isActivityOpen && selectedProductForActivity && (
        <ProductActivityDialog 
          isOpen={isActivityOpen} 
          onOpenChange={setIsActivityOpen} 
          productName={selectedProductForActivity.name}
          productIds={selectedProductForActivity.ids}
        />
      )}
      {isIssuesOpen && selectedProductForActivity && (
        <ProductIssuesDialog 
          isOpen={isIssuesOpen} 
          onOpenChange={setIsIssuesOpen} 
          productName={selectedProductForActivity.name}
          productIds={selectedProductForActivity.ids}
        />
      )}
      {isSettingsOpen && <InventorySettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />}
      {isDeliveryOpen && <DeliveryFormDialog isOpen={isDeliveryOpen} onOpenChange={setIsDeliveryOpen} branch={selectedBranch} onSuccess={() => {}} onAddNewProduct={() => { setEditingProduct(null); setIsFormOpen(true); }} />}
      {isImportOpen && <InventoryImportDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} branch={selectedBranch} onImportSuccess={() => {}} />}
    </div>
  );
}
