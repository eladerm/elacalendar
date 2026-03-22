
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  Timestamp,
  onSnapshot,
  increment,
  runTransaction,
} from "firebase/firestore";
import type { Product } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductSearchCombobox } from "./product-search-combobox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const stockEntrySchema = z.object({
  productId: z.string().min(1, "Debes seleccionar un producto."),
  newName: z.string().optional(),
  newBrand: z.string().optional(),
  newCategory: z.string().optional(),
  newUnit: z.string().optional(),
  newPackageSize: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  subtotal: z.coerce.number().min(0).optional(),
  totalWithIva: z.coerce.number().min(0).optional(),
  commercialName: z.string().optional(),
  distributorPhone: z.string().optional(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

type StockEntryFormData = z.infer<typeof stockEntrySchema>;

interface StockEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  branch: "Matriz" | "Valle";
}

export function StockEntryDialog({
  isOpen,
  onOpenChange,
  branch,
}: StockEntryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryConfig, setInventoryConfig] = useState<{ categories: string[], units: string[], productNames: string[] }>({ categories: [], units: [], productNames: [] });

  const form = useForm<StockEntryFormData>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      totalWithIva: 0,
      commercialName: "",
      distributorPhone: "",
    },
  });

  const productIdValue = form.watch("productId");
  const newNameValue = form.watch("newName");
  const unitPriceValue = form.watch("unitPrice") || 0;
  const quantityValue = form.watch("quantity") || 0;
  const isNewProduct = productIdValue === 'new';

  const isDuplicateName = useMemo(() => {
    if (!isNewProduct || !newNameValue) return false;
    return inventoryConfig.productNames.some(n => n.toUpperCase().trim() === newNameValue.toUpperCase().trim());
  }, [newNameValue, inventoryConfig.productNames, isNewProduct]);

  useEffect(() => {
    const sub = Number(unitPriceValue) * Number(quantityValue);
    const total = sub * 1.15;
    form.setValue("subtotal", Number(sub.toFixed(3)));
    form.setValue("totalWithIva", Number(total.toFixed(3)));
  }, [unitPriceValue, quantityValue, form]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = onSnapshot(collection(db, "inventory"), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Product))
        .filter((p) => p.branch === branch);
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    });
    const unsubConfig = onSnapshot(doc(db, "inventory_config", "settings"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setInventoryConfig({
          categories: data.categories || [],
          units: data.units || [],
          productNames: data.productNames || [],
        });
      }
    });
    return () => { unsub(); unsubConfig(); };
  }, [isOpen, branch]);

  useEffect(() => {
    if (productIdValue && productIdValue !== 'new') {
      const p = products.find(prod => prod.id === productIdValue);
      if (p) {
        form.setValue("unitPrice", p.unitPrice || 0);
        form.setValue("commercialName", p.commercialName || "");
        form.setValue("distributorPhone", p.distributorPhone || "");
      }
    }
  }, [productIdValue, products, form]);

  const onSubmit = async (data: StockEntryFormData) => {
    if (isSubmitting || !user) return;
    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        let targetProductId = data.productId;
        let productName = data.newName?.toUpperCase() || "";
        if (isNewProduct) {
          const settingsRef = doc(db, 'inventory_config', 'settings');
          const settingsSnap = await transaction.get(settingsRef);
          const lastNumber = settingsSnap.exists() ? (settingsSnap.data().lastCodeNumber || 0) : 0;
          const nextNumber = lastNumber + 1;
          const newCode = `ST-${nextNumber.toString().padStart(4, '0')}`;
          transaction.update(settingsRef, { lastCodeNumber: nextNumber });
          const newProductRef = doc(collection(db, "inventory"));
          const newProductData = {
            name: data.newName?.toUpperCase().trim(),
            brand: data.newBrand?.toUpperCase().trim() || "GENÉRICO",
            category: data.newCategory?.toUpperCase().trim(),
            unit: data.newUnit?.toUpperCase().trim(),
            packageSize: data.newPackageSize?.toUpperCase().trim() || "",
            code: newCode, branch, location: 'BODEGA', sealedCount: data.quantity, inUseCount: 0, finishedCount: 0, minStock: 1,
            unitPrice: data.unitPrice, subtotal: data.subtotal, totalWithIva: data.totalWithIva,
            commercialName: data.commercialName, distributorPhone: data.distributorPhone, lastUpdated: Timestamp.now()
          };
          transaction.set(newProductRef, newProductData);
          targetProductId = newProductRef.id;
          productName = newProductData.name!;
        } else {
          const productRef = doc(db, "inventory", targetProductId);
          const p = products.find(prod => prod.id === targetProductId);
          productName = p?.name || "";
          transaction.update(productRef, {
            sealedCount: increment(data.quantity),
            unitPrice: data.unitPrice, subtotal: data.subtotal, totalWithIva: data.totalWithIva,
            commercialName: data.commercialName, distributorPhone: data.distributorPhone, lastUpdated: Timestamp.now(),
          });
        }
        const logRef = doc(collection(db, "activity_log"));
        transaction.set(logRef, {
          userId: user.id, userName: user.name,
          action: `Ingresó ${data.quantity} unidad(es) de "${productName}" a la BODEGA de ${branch}.`,
          timestamp: Timestamp.now(), productId: targetProductId,
        });
      });
      toast({ title: "Ingreso Exitoso" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchColor = branch === 'Matriz' ? "text-pink-600" : "text-purple-700";
  const branchBg = branch === 'Matriz' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-purple-700 hover:bg-purple-800';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 border-none overflow-hidden">
        <DialogHeader className="p-4 bg-muted/20 border-b">
          <DialogTitle className={cn("text-base font-black uppercase flex items-center gap-2", branchColor)}>
            <Download className="w-4 h-4" /> Ingreso Insumos - {branch}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-[10px] uppercase text-muted-foreground">Producto</FormLabel>
                    <FormControl>
                      <ProductSearchCombobox products={products} value={field.value} onChange={field.onChange} placeholder="BUSCAR..." showStock={false} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              {isNewProduct && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border border-dashed animate-in fade-in">
                  <div className="col-span-full font-black text-[9px] uppercase text-primary">Ficha Técnica</div>
                  
                  {isDuplicateName && (
                    <div className="col-span-full mb-2">
                      <Alert className="bg-orange-50 border-orange-200 py-1.5">
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                        <AlertDescription className="text-[9px] font-black text-orange-800 uppercase leading-none">
                          NOMBRE EXISTENTE. POR FAVOR, BUSQUE SI YA EXISTE ANTES DE CREARLO.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <FormField control={form.control} name="newName" render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-bold uppercase">Nombre</FormLabel><FormControl><Input {...field} className="h-8 text-xs uppercase" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="newBrand" render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-bold uppercase">Marca</FormLabel><FormControl><Input {...field} className="h-8 text-xs uppercase" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="newCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase">Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                        <SelectContent>{inventoryConfig.categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newUnit" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase">Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                        <SelectContent>{inventoryConfig.units.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-bold uppercase">Precio Unitario ($)</FormLabel>
                    <FormControl><Input type="number" step="0.001" {...field} className="h-8 text-xs font-bold" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="subtotal" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-bold uppercase">Subtotal</FormLabel>
                    <FormControl><Input type="number" step="0.001" {...field} readOnly className="h-8 text-xs font-bold bg-muted/30" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="totalWithIva" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-bold uppercase text-primary">MÁS IVA</FormLabel>
                    <FormControl><Input type="number" step="0.001" {...field} readOnly className="h-8 text-xs font-black text-primary border-primary/20 bg-primary/5" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="commercialName" render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] font-bold uppercase">Proveedor Comercial</FormLabel><FormControl><Input {...field} className="h-8 text-xs uppercase" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="distributorPhone" render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] font-bold uppercase">Teléfono</FormLabel><FormControl><Input {...field} className="h-8 text-xs" /></FormControl></FormItem>
                )} />
              </div>

              <Separator />

              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-[10px] uppercase">Cantidad Recibida</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} className="h-10 text-lg font-black text-center border-primary/30" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />

              <DialogFooter className="pt-2 border-t gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-[10px] font-bold uppercase h-8 flex-1">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} size="sm" className={cn("text-[10px] font-black uppercase text-white h-8 flex-1", branchBg)}>
                  {isSubmitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
