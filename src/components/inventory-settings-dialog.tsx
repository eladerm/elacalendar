
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { Plus, X, Tag, Ruler, Loader2, ListTodo, Award, UploadCloud, FileJson, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { extractItemsFromImage } from '@/ai/flows/extract-items-flow';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OFFICIAL_CATALOG_NAMES } from '@/lib/seed-inventory';

export function InventorySettingsDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImportZone, setShowImportZone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsub = onSnapshot(doc(db, 'inventory_config', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCategories(data.categories || []);
        setUnits(data.units || []);
        setProductNames(data.productNames || []);
        setBrands(data.brands || []);
      } else {
        setDoc(doc(db, 'inventory_config', 'settings'), {
          categories: ["MASCARILLAS", "LIMPIEZA", "INSUMOS", "ACCESORIOS"],
          units: ["UNIDADES", "ML", "GALÓN", "LITRO", "PAQUETES", "RESMAS", "CAJAS", "ROLLOS"],
          productNames: [],
          brands: [],
          lastCodeNumber: 0
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen]);

  const addNamesToDb = async (names: string[]) => {
    const uniqueNames = Array.from(new Set(names.map(n => n.toUpperCase().trim()))).filter(n => n.length > 0);
    if (uniqueNames.length === 0) return;
    
    await updateDoc(doc(db, 'inventory_config', 'settings'), {
      productNames: arrayUnion(...uniqueNames)
    });
  };

  const handleLoadOfficialList = async () => {
    try {
      await addNamesToDb(OFFICIAL_CATALOG_NAMES);
      toast({ title: "Lista cargada", description: "Se han añadido los nombres oficiales al catálogo." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cargar la lista oficial.", variant: "destructive" });
    }
  };

  const handleClearAllNames = async () => {
    try {
      await updateDoc(doc(db, 'inventory_config', 'settings'), {
        productNames: []
      });
      toast({ title: "Catálogo limpiado", description: "Se han eliminado todos los nombres del listado." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo limpiar el catálogo.", variant: "destructive" });
    }
  };

  const handleClearAllUnits = async () => {
    try {
      await updateDoc(doc(db, 'inventory_config', 'settings'), {
        units: []
      });
      toast({ title: "Unidades limpiadas", description: "Se han eliminado todas las unidades de medida." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo limpiar el listado de unidades.", variant: "destructive" });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsProcessing(true);

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUri = reader.result as string;
          try {
            const results = await extractItemsFromImage({ photoDataUri: dataUri });
            await addNamesToDb(results);
            toast({ title: "IA: Procesamiento completado", description: `Se extrajeron ${results.length} nombres de productos.` });
          } catch (e) {
            toast({ title: "Error en IA", description: "No se pudo procesar la foto.", variant: "destructive" });
          } finally {
            setIsProcessing(false);
            setShowImportZone(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const extracted = json.flat()
          .filter(val => typeof val === 'string' && val.length > 2)
          .map(val => String(val).toUpperCase().trim());

        if (extracted.length > 0) {
          await addNamesToDb(extracted);
          toast({ title: "Importación exitosa", description: `Se añadieron ${extracted.length} nombres desde el archivo.` });
        }
        setIsProcessing(false);
        setShowImportZone(false);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error al importar", variant: "destructive" });
      setIsProcessing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const value = newCategory.trim().toUpperCase();
    await updateDoc(doc(db, 'inventory_config', 'settings'), { categories: arrayUnion(value) });
    setNewCategory('');
  };

  const handleAddUnit = async () => {
    if (!newUnit.trim()) return;
    const value = newUnit.trim().toUpperCase();
    await updateDoc(doc(db, 'inventory_config', 'settings'), { units: arrayUnion(value) });
    setNewUnit('');
  };

  const handleAddName = async () => {
    if (!newName.trim()) return;
    const value = newName.trim().toUpperCase();
    await updateDoc(doc(db, 'inventory_config', 'settings'), { productNames: arrayUnion(value) });
    setNewName('');
  };

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;
    const value = newBrand.trim().toUpperCase();
    await updateDoc(doc(db, 'inventory_config', 'settings'), { brands: arrayUnion(value) });
    setNewBrand('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configuración de Inventario</DialogTitle>
          <DialogDescription>
            Gestiona el catálogo de nombres, unidades, marcas y categorías.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : (
            <Tabs defaultValue="names" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="names" className="gap-2 text-[10px] sm:text-xs">
                        <ListTodo className="w-3.5 h-3.5" /> Nombres
                    </TabsTrigger>
                    <TabsTrigger value="units" className="gap-2 text-[10px] sm:text-xs">
                        <Ruler className="w-3.5 h-3.5" /> Unidades
                    </TabsTrigger>
                    <TabsTrigger value="brands" className="gap-2 text-[10px] sm:text-xs">
                        <Award className="w-3.5 h-3.5" /> Marcas
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="gap-2 text-[10px] sm:text-xs">
                        <Tag className="w-3.5 h-3.5" /> Categorías
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="names" className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Escribir nuevo nombre..." 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddName()}
                                className="uppercase font-bold"
                            />
                            <Button size="icon" onClick={handleAddName}><Plus className="h-4 w-4" /></Button>
                        </div>
                        
                        <div className="flex gap-2">
                          {!showImportZone ? (
                            <Button 
                              variant="secondary" 
                              className="flex-1 gap-2 font-black uppercase text-xs py-6 bg-primary/10 text-primary border-2 border-primary/20 hover:bg-primary/20 transition-all"
                              onClick={() => setShowImportZone(true)}
                            >
                              <UploadCloud className="w-5 h-5" />
                              Importar (IA/Archivo)
                            </Button>
                          ) : (
                            <div 
                              {...getRootProps()} 
                              className={cn(
                                "flex-1 border-4 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all",
                                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40 bg-muted/10",
                                isProcessing && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <input {...getInputProps()} />
                              {isProcessing ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                                  <p className="text-[10px] font-black uppercase text-primary animate-pulse">Analizando...</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase">Arrastra archivo o foto aquí</p>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowImportZone(false); }} className="h-6 text-[9px] uppercase font-bold text-muted-foreground">Cancelar</Button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              className="gap-2 border-green-200 text-green-700 hover:bg-green-50 font-black uppercase text-[10px] h-auto py-2"
                              onClick={handleLoadOfficialList}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Lista Oficial
                            </Button>

                            {productNames.length > 0 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="gap-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-white font-black uppercase text-[10px] h-auto py-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Borrar Todo
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar todos los nombres?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará todos los nombres del catálogo de sugerencias. Los productos ya creados en el inventario no se verán afectados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearAllNames} className="bg-destructive text-white hover:bg-destructive/90">
                                      Sí, eliminar todo
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-muted/20 rounded-xl border border-dashed">
                        {productNames.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center w-full py-4 uppercase font-bold italic">No hay nombres registrados</p>
                        ) : productNames.map((name) => (
                            <Badge key={name} variant="secondary" className="pl-3 pr-1 py-1 gap-1 group bg-white border border-border/60 hover:border-primary/40 transition-colors">
                                <span className="font-bold text-[10px] uppercase">{name}</span>
                                <button onClick={() => updateDoc(doc(db, 'inventory_config', 'settings'), { productNames: arrayRemove(name) })} className="hover:bg-destructive hover:text-white rounded-full p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="units" className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-1 gap-2">
                            <Input 
                                placeholder="Nueva unidad (ej. GALÓN)..." 
                                value={newUnit}
                                onChange={(e) => setNewUnit(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                                className="uppercase font-bold"
                            />
                            <Button size="icon" onClick={handleAddUnit}><Plus className="h-4 w-4" /></Button>
                        </div>
                        {units.length > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Borrar todas las unidades?</AlertDialogTitle>
                                <AlertDialogDescription>Limpiarás el listado de unidades sugeridas.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearAllUnits} className="bg-destructive text-white">Borrar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-muted/20 rounded-xl border border-dashed">
                        {units.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center w-full py-4 uppercase font-bold italic">No hay unidades registradas</p>
                        ) : units.map((u) => (
                            <Badge key={u} variant="outline" className="pl-3 pr-1 py-1 gap-1 border-primary/30 bg-white">
                                <span className="font-bold text-[10px] uppercase">{u}</span>
                                <button onClick={() => updateDoc(doc(db, 'inventory_config', 'settings'), { units: arrayRemove(u) })} className="hover:bg-destructive hover:text-white rounded-full p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="brands" className="space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Nueva marca..." 
                            value={newBrand}
                            onChange={(e) => setNewBrand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
                            className="uppercase font-bold"
                        />
                        <Button size="icon" onClick={handleAddBrand}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-muted/20 rounded-xl border border-dashed">
                        {brands.map((brand) => (
                            <Badge key={brand} variant="secondary" className="pl-3 pr-1 py-1 gap-1 group bg-white border">
                                <span className="font-bold text-[10px] uppercase">{brand}</span>
                                <button onClick={() => updateDoc(doc(db, 'inventory_config', 'settings'), { brands: arrayRemove(brand) })} className="hover:bg-destructive hover:text-white rounded-full p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Nueva categoría..." 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            className="uppercase font-bold"
                        />
                        <Button size="icon" onClick={handleAddCategory}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-muted/20 rounded-xl border border-dashed">
                        {categories.map((cat) => (
                            <Badge key={cat} variant="secondary" className="pl-3 pr-1 py-1 gap-1 group bg-white border">
                                <span className="font-bold text-[10px] uppercase">{cat}</span>
                                <button onClick={() => updateDoc(doc(db, 'inventory_config', 'settings'), { categories: arrayRemove(cat) })} className="hover:bg-destructive hover:text-white rounded-full p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full font-bold uppercase text-xs">
            Cerrar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
