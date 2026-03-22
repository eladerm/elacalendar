
"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Product } from '@/lib/types';
import { UploadCloud, File, AlertCircle, CheckCircle2, PackagePlus, Loader2, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDocs, Timestamp, addDoc, query, where, limit } from 'firebase/firestore';
import { cn, removeUndefined } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface InventoryImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  branch: 'Matriz' | 'Valle';
  onImportSuccess: () => void;
}

// Mapeo flexible de encabezados para inventario
const fieldMappings = {
    name: ['nombre', 'producto', 'insumo', 'item', 'descripcion', 'artículo'],
    brand: ['marca', 'proveedor', 'laboratorio', 'brand'],
    category: ['categoria', 'categoría', 'grupo', 'tipo de producto', 'clase'],
    unit: ['unidad', 'medida', 'u.m', 'unit'],
    packageSize: ['presentación', 'presentacion', 'tamaño', 'formato', 'volumen', 'capacidad'],
    code: ['codigo', 'código', 'cod', 'sku', 'referencia'],
    sealedCount: ['stock', 'cantidad', 'sellado', 'bodega', 'unidades', 'cant', 'existencia', 'stock_sellado'],
    inUseCount: ['uso', 'en uso', 'cabina', 'abierto'],
    finishedCount: ['terminados', 'terminado', 'consumido'],
    unitPrice: ['precio', 'costo', 'p. unit', 'valor unitario', 'unit price', 'p.u', 'precio_unitario'],
    minStock: ['stock minimo', 'minimo', 'alerta', 'stock_minimo'],
    location: ['ubicacion', 'ubicación', 'location', 'sector', 'área']
};

const findHeader = (row: any, aliases: string[]): string | undefined => {
    const headers = Object.keys(row);
    return headers.find(h => {
        const normalizedHeader = h.toLowerCase().trim();
        return aliases.some(alias => normalizedHeader === alias || normalizedHeader.includes(alias));
    });
};

export function InventoryImportDialog({ isOpen, onOpenChange, branch, onImportSuccess }: InventoryImportDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<Partial<Product>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setFile(null);
    setProcessedData([]);

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setIsParsing(true);
      
      const reader = new FileReader();

      reader.onload = (event) => {
          const fileContent = event.target?.result;
          if (!fileContent) {
              setError('No se pudo leer el archivo.');
              setIsParsing(false);
              return;
          }

          try {
            const workbook = XLSX.read(fileContent, { type: 'binary' });
            
            const allRows: any[] = [];
            workbook.SheetNames.forEach(name => {
                const worksheet = workbook.Sheets[name];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                allRows.push(...json);
            });

            if (allRows.length === 0) {
                throw new Error("El archivo no contiene datos en ninguna pestaña.");
            }

            // DEDUPLICACIÓN INTERNA: Usamos un Map para asegurar que no haya duplicados en el mismo archivo
            const itemsMap = new Map<string, Partial<Product>>();

            allRows.forEach(row => {
                const nameKey = findHeader(row, fieldMappings.name);
                if (!nameKey || !row[nameKey]) return;

                const brandKey = findHeader(row, fieldMappings.brand);
                const categoryKey = findHeader(row, fieldMappings.category);
                const unitKey = findHeader(row, fieldMappings.unit);
                const packageKey = findHeader(row, fieldMappings.packageSize);
                const codeKey = findHeader(row, fieldMappings.code);
                const sealedKey = findHeader(row, fieldMappings.sealedCount);
                const inUseKey = findHeader(row, fieldMappings.inUseCount);
                const finishedKey = findHeader(row, fieldMappings.finishedCount);
                const priceKey = findHeader(row, fieldMappings.unitPrice);
                const minStockKey = findHeader(row, fieldMappings.minStock);
                const locKey = findHeader(row, fieldMappings.location);

                const name = String(row[nameKey]).toUpperCase().trim();
                const brand = brandKey ? String(row[brandKey]).toUpperCase().trim() : 'GENÉRICO';
                const locationStr = locKey ? String(row[locKey]).toUpperCase().trim() : 'BODEGA';
                const finalLocation: 'BODEGA' | 'ESTABLECIMIENTO' = (locationStr.includes('CABINA') || locationStr.includes('ESTABLECIMIENTO')) ? 'ESTABLECIMIENTO' : 'BODEGA';

                // Clave única para deduplicar: Nombre + Marca + Sede + Ubicación
                const uniqueKey = `${name}|${brand}|${branch}|${finalLocation}`;

                const item: Partial<Product> = {
                    name,
                    brand,
                    category: categoryKey ? String(row[categoryKey]).toUpperCase().trim() : 'VARIOS',
                    unit: unitKey ? String(row[unitKey]).toUpperCase().trim() : 'UNIDADES',
                    packageSize: packageKey ? String(row[packageKey]).toUpperCase().trim() : '',
                    code: codeKey ? String(row[codeKey]).trim() : '',
                    sealedCount: sealedKey ? Number(row[sealedKey]) || 0 : 0,
                    inUseCount: inUseKey ? Number(row[inUseKey]) || 0 : 0,
                    finishedCount: finishedKey ? Number(row[finishedKey]) || 0 : 0,
                    unitPrice: priceKey ? Number(row[priceKey]) || 0 : 0,
                    minStock: minStockKey ? Number(row[minStockKey]) || 1 : 1,
                    branch,
                    location: finalLocation,
                    type: 'GENERAL'
                };

                // Si ya existe en el archivo, sobrescribimos con el último registro encontrado (que suele ser el más actualizado)
                itemsMap.set(uniqueKey, item);
            });

            setProcessedData(Array.from(itemsMap.values()));
          } catch (err: any) {
              setError(`Error al procesar el archivo: ${err.message}`);
          } finally {
              setIsParsing(false);
          }
      };

      reader.onerror = () => {
          setError('Error al leer el archivo.');
          setIsParsing(false);
      }
      
      reader.readAsBinaryString(selectedFile);
    }
  }, [branch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: isParsing || isSaving
  });

  const handleConfirmImport = async () => {
    if (processedData.length === 0 || isSaving) return;
    setIsSaving(true);

    try {
        // 1. Cargar inventario actual y configuración de códigos
        const inventorySnap = await getDocs(collection(db, 'inventory'));
        const existingProducts = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        
        const settingsRef = doc(db, 'inventory_config', 'settings');
        const settingsSnapRaw = await getDocs(query(collection(db, 'inventory_config'), limit(1)));
        let lastCodeNumber = 0;
        if (!settingsSnapRaw.empty) {
            lastCodeNumber = settingsSnapRaw.docs.find(d => d.id === 'settings')?.data()?.lastCodeNumber || 0;
        }

        const CHUNK_SIZE = 100;
        const chunks = [];
        for (let i = 0; i < processedData.length; i += CHUNK_SIZE) {
            chunks.push(processedData.slice(i, i + CHUNK_SIZE));
        }

        let newCodesAdded = 0;

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            for (const item of chunk) {
                // Buscar si existe exactamente en esta sede, marca y ubicación para actualizar
                const exists = existingProducts.find(p => 
                    p.name.toUpperCase().trim() === item.name?.toUpperCase().trim() && 
                    (p.brand || 'GENÉRICO').toUpperCase().trim() === (item.brand || 'GENÉRICO').toUpperCase().trim() && 
                    p.branch === branch &&
                    p.location === item.location
                );

                if (exists) {
                    const docRef = doc(db, 'inventory', exists.id);
                    batch.update(docRef, removeUndefined({
                        sealedCount: item.sealedCount ?? exists.sealedCount,
                        inUseCount: item.inUseCount ?? exists.inUseCount,
                        finishedCount: item.finishedCount ?? exists.finishedCount,
                        unitPrice: item.unitPrice || exists.unitPrice || 0,
                        minStock: item.minStock || exists.minStock || 1,
                        category: item.category || exists.category,
                        unit: item.unit || exists.unit,
                        packageSize: item.packageSize || exists.packageSize,
                        lastUpdated: Timestamp.now()
                    }));
                } else {
                    const docRef = doc(collection(db, 'inventory'));
                    
                    // Si no tiene código el Excel, generamos uno nuevo
                    let finalCode = item.code;
                    if (!finalCode) {
                        lastCodeNumber++;
                        newCodesAdded++;
                        finalCode = `ST-${lastCodeNumber.toString().padStart(4, '0')}`;
                    }

                    batch.set(docRef, {
                        ...item,
                        code: finalCode,
                        lastUpdated: Timestamp.now()
                    });
                }
            }
            
            // Si generamos códigos nuevos, actualizamos el contador global
            if (newCodesAdded > 0) {
                batch.update(settingsRef, { lastCodeNumber });
            }

            await batch.commit();
        }
        
        await addDoc(collection(db, 'activity_log'), {
            userId: 'sistema',
            userName: 'Administrador',
            action: `Sincronización masiva (Deduplicada): procesó ${processedData.length} registros únicos en ${branch}.`,
            timestamp: Timestamp.now()
        });

        toast({ title: "Importación Exitosa", description: `Se sincronizaron ${processedData.length} productos únicos correctamente.` });
        onImportSuccess();
        onOpenChange(false);
    } catch (e: any) {
        console.error("Error detallado de importación:", e);
        toast({ title: "Error al importar", description: e.message || "Error desconocido durante la carga.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Sincronización Inteligente de Inventario
          </DialogTitle>
          <DialogDescription>
            El sistema detectará automáticamente productos repetidos en el archivo y solo procesará registros únicos para evitar duplicidad de stock.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-0 space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de Formato</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!processedData.length && !isParsing ? (
                <div {...getRootProps()} className={cn(
                    "border-4 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40 bg-muted/5"
                )}>
                    <input {...getInputProps()} />
                    <UploadCloud className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
                    <div className="space-y-2">
                        <p className="font-black uppercase tracking-tight text-lg">Arrastra tu archivo Excel aquí</p>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Actualizaremos el stock si el producto ya existe o crearemos uno nuevo si es único.
                        </p>
                    </div>
                </div>
            ) : null}

            {isParsing && (
                <div className="py-20 text-center space-y-4">
                    <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
                    <p className="font-bold uppercase text-muted-foreground animate-pulse">Eliminando duplicados del archivo...</p>
                </div>
            )}

            {processedData.length > 0 && (
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-dashed">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <File className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-black uppercase text-xs">{file?.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold">
                                    {processedData.length} REGISTROS ÚNICOS IDENTIFICADOS EN {branch.toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-green-600 text-white font-black px-3 py-1">ARCHIVO DEPURADO</Badge>
                    </div>

                    <ScrollArea className="flex-1 border rounded-2xl">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase">Producto</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Marca</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-center">Ubicación</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-center">Sellados</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-center">Uso</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-right">Precio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedData.slice(0, 50).map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/5 transition-colors">
                                        <TableCell className="font-bold text-xs uppercase">{item.name}</TableCell>
                                        <TableCell className="text-xs uppercase text-muted-foreground">{item.brand}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary">
                                                {item.location === 'ESTABLECIMIENTO' ? 'CABINA' : 'BODEGA'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-black">{item.sealedCount}</TableCell>
                                        <TableCell className="text-center font-bold text-primary">{item.inUseCount}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">${(item.unitPrice || 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {processedData.length > 50 && (
                            <div className="p-4 text-center text-[10px] font-bold text-muted-foreground bg-muted/10">
                                ... Y {processedData.length - 50} PRODUCTOS ÚNICOS MÁS
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold uppercase text-xs">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmImport} 
            disabled={processedData.length === 0 || isSaving || isParsing}
            className="font-black uppercase text-xs min-w-[240px]"
          >
            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PackagePlus className="mr-2 h-4 w-4" />}
            Sincronizar Registros No Repetidos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
