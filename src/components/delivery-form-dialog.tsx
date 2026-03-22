
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  Timestamp,
  onSnapshot,
  runTransaction,
  increment,
  query,
  where,
  limit,
  getDocs
} from "firebase/firestore";
import type { Product } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SendHorizontal, AlertTriangle, ChevronsUpDown, Check, Camera, Globe, MapPin, Phone, LayoutGrid, Plus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductSearchCombobox } from "./product-search-combobox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const deliverySchema = z.object({
  productId: z.string().min(1, "Debes seleccionar un producto."),
  location: z.enum(['BODEGA', 'ESTABLECIMIENTO']).default('BODEGA'),
  newName: z.string().optional(),
  newBrand: z.string().optional(),
  newCategory: z.string().optional(),
  newUnit: z.string().optional(),
  newPackageSize: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  hasIva: z.boolean().default(true),
  subtotal: z.coerce.number().optional(),
  totalWithIva: z.coerce.number().optional(),
  commercialName: z.string().optional(),
  distributorPhone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  supplierAddress: z.string().optional(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  notes: z.string().optional(),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

interface DeliveryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  branch: "Matriz" | "Valle";
  onSuccess: () => void;
  onAddNewProduct?: () => void;
}

export function DeliveryFormDialog({
  isOpen,
  onOpenChange,
  branch,
  onSuccess,
}: DeliveryFormDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryConfig, setInventoryConfig] = useState<{ categories: string[], units: string[], productNames: string[], brands: string[] }>({ categories: [], units: [], productNames: [], brands: [] });
  
  const [isNamePopoverOpen, setIsNamePopoverOpen] = useState(false);
  const [isBrandPopoverOpen, setIsBrandPopoverOpen] = useState(false);
  
  const [nameSearch, setNameSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      productId: "",
      location: "BODEGA",
      quantity: 1,
      notes: "",
      unitPrice: 0,
      hasIva: true,
      subtotal: 0,
      totalWithIva: 0,
      commercialName: "",
      distributorPhone: "",
      secondaryPhone: "",
      supplierAddress: "",
      website: "",
      imageUrl: "",
    },
  });

  const productIdValue = form.watch("productId");
  const newNameValue = form.watch("newName");
  const unitPriceValue = form.watch("unitPrice") || 0;
  const quantityValue = form.watch("quantity") || 0;
  const hasIvaValue = form.watch("hasIva");
  const isNewProduct = productIdValue === 'new';

  useEffect(() => {
    const sub = Number(unitPriceValue) * Number(quantityValue);
    const iva = hasIvaValue ? sub * 0.15 : 0;
    const total = sub + iva;
    
    form.setValue("subtotal", Number(sub.toFixed(3)));
    form.setValue("totalWithIva", Number(total.toFixed(3)));
  }, [unitPriceValue, quantityValue, hasIvaValue, form]);

  const isDuplicateName = useMemo(() => {
    if (!isNewProduct || !newNameValue) return false;
    return products.some(p => p.name.toUpperCase().trim() === newNameValue.toUpperCase().trim());
  }, [newNameValue, products, isNewProduct]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubProducts = onSnapshot(collection(db, "inventory"), (snap) => {
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
          brands: data.brands || [],
        });
      }
    });
    return () => { unsubProducts(); unsubConfig(); };
  }, [isOpen, branch]);

  useEffect(() => {
    if (productIdValue && productIdValue !== 'new') {
      const p = products.find(prod => prod.id === productIdValue);
      if (p) {
        form.setValue("unitPrice", p.unitPrice || 0);
        form.setValue("commercialName", p.commercialName || "");
        form.setValue("distributorPhone", p.distributorPhone || "");
        form.setValue("secondaryPhone", p.secondaryPhone || "");
        form.setValue("supplierAddress", p.supplierAddress || "");
        form.setValue("website", p.website || "");
        form.setValue("imageUrl", p.imageUrl || "");
        form.setValue("location", p.location);
        setPreviewUrl(p.imageUrl || null);
      }
    } else if (isNewProduct) {
      setPreviewUrl(null);
    }
  }, [productIdValue, products, form, isNewProduct]);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productIdValue), [products, productIdValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { 
        toast({ title: "Archivo demasiado grande", description: "Límite 500KB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewUrl(base64String);
        form.setValue('imageUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: DeliveryFormData) => {
    if (!currentUser || isSubmitting) return;
    
    setIsSubmitting(true);
    const targetLocation = data.location;

    try {
      await runTransaction(db, async (transaction) => {
        let targetProductId = data.productId;
        let productName = selectedProduct?.name || data.newName?.toUpperCase() || "";
        
        if (isNewProduct) {
          const settingsRef = doc(db, 'inventory_config', 'settings');
          const settingsSnap = await transaction.get(settingsRef);
          const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
          
          const lastNumber = settingsData.lastCodeNumber || 0;
          const nextNumber = lastNumber + 1;
          const newCode = `ST-${nextNumber.toString().padStart(4, '0')}`;
          
          const finalName = data.newName?.toUpperCase().trim() || "";
          const finalBrand = data.newBrand?.toUpperCase().trim() || "GENÉRICO";
          const finalCategory = data.newCategory?.toUpperCase().trim() || "VARIOS";
          const finalUnit = data.newUnit?.toUpperCase().trim() || "UNIDADES";

          const updatedBrands = Array.from(new Set([...(settingsData.brands || []), finalBrand])).sort();
          const updatedCategories = Array.from(new Set([...(settingsData.categories || []), finalCategory])).sort();
          const updatedUnits = Array.from(new Set([...(settingsData.units || []), finalUnit])).sort();
          const updatedProductNames = Array.from(new Set([...(settingsData.productNames || []), finalName])).sort();

          transaction.update(settingsRef, { 
            lastCodeNumber: nextNumber,
            brands: updatedBrands,
            categories: updatedCategories,
            units: updatedUnits,
            productNames: updatedProductNames
          });
          
          const newProductRef = doc(collection(db, "inventory"));
          const newProductData = {
            name: finalName,
            brand: finalBrand,
            category: finalCategory,
            unit: finalUnit,
            packageSize: data.newPackageSize?.toUpperCase().trim() || "",
            code: newCode, 
            branch, 
            location: targetLocation, 
            sealedCount: data.quantity, 
            inUseCount: 0, 
            finishedCount: 0, 
            minStock: 1,
            unitPrice: data.unitPrice || 0,
            subtotal: data.subtotal || 0,
            totalWithIva: data.totalWithIva || 0,
            commercialName: data.commercialName || "", 
            distributorPhone: data.distributorPhone || "", 
            secondaryPhone: data.secondaryPhone || "",
            supplierAddress: data.supplierAddress || "",
            website: data.website || "",
            imageUrl: data.imageUrl || "",
            lastUpdated: Timestamp.now()
          };
          transaction.set(newProductRef, newProductData);
          targetProductId = newProductRef.id;
          productName = newProductData.name!;
        } else {
          if (selectedProduct?.location !== targetLocation) {
            const qSameProd = query(
              collection(db, "inventory"),
              where('name', '==', selectedProduct?.name),
              where('brand', '==', selectedProduct?.brand || 'GENÉRICO'),
              where('unit', '==', selectedProduct?.unit || 'UNIDADES'),
              where('branch', '==', branch),
              where('location', '==', targetLocation),
              limit(1)
            );
            const targetSnap = await getDocs(qSameProd);
            
            if (!targetSnap.empty) {
              const targetRef = doc(db, "inventory", targetSnap.docs[0].id);
              transaction.update(targetRef, {
                sealedCount: increment(data.quantity),
                unitPrice: data.unitPrice || 0,
                subtotal: data.subtotal || 0,
                totalWithIva: data.totalWithIva || 0,
                lastUpdated: Timestamp.now(),
              });
              targetProductId = targetSnap.docs[0].id;
            } else {
              const newLocRef = doc(collection(db, "inventory"));
              const { id, lastUpdated, ...copyData } = selectedProduct!;
              transaction.set(newLocRef, {
                ...copyData,
                location: targetLocation,
                sealedCount: data.quantity,
                inUseCount: 0,
                finishedCount: 0,
                unitPrice: data.unitPrice || 0,
                subtotal: data.subtotal || 0,
                totalWithIva: data.totalWithIva || 0,
                lastUpdated: Timestamp.now()
              });
              targetProductId = newLocRef.id;
            }
          } else {
            const productRef = doc(db, "inventory", targetProductId);
            transaction.update(productRef, {
              sealedCount: increment(data.quantity),
              unitPrice: data.unitPrice || 0,
              subtotal: data.subtotal || 0,
              totalWithIva: data.totalWithIva || 0,
              commercialName: data.commercialName || "", 
              distributorPhone: data.distributorPhone || "", 
              secondaryPhone: data.secondaryPhone || "",
              supplierAddress: data.supplierAddress || "",
              website: data.website || "",
              imageUrl: data.imageUrl || selectedProduct?.imageUrl || "",
              lastUpdated: Timestamp.now(),
            });
          }
        }

        const deliveryRef = doc(collection(db, "deliveries"));
        transaction.set(deliveryRef, {
          date: Timestamp.now(), 
          giverId: currentUser.id, 
          giverName: currentUser.name,
          receiverId: targetLocation === 'BODEGA' ? "SISTEMA_BODEGA" : "SISTEMA_CABINA", 
          receiverName: targetLocation === 'BODEGA' ? "Bodega" : "Cabina", 
          productId: targetProductId,
          productName: productName, 
          quantity: data.quantity, 
          branch, 
          notes: data.notes || "",
        });

        const logRef = doc(collection(db, "activity_log"));
        transaction.set(logRef, {
          userId: currentUser.id, 
          userName: currentUser.name,
          action: `Entrega administrativa: ${data.quantity} unidad(es) de "${productName}" a ${targetLocation}. Total: $${data.totalWithIva?.toFixed(3)}`,
          timestamp: Timestamp.now(), 
          productId: targetProductId,
        });
      });

      toast({ title: `Ingreso Exitoso en ${targetLocation}` });
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchColor = branch === 'Matriz' ? 'text-pink-600' : 'text-purple-700';
  const branchBg = branch === 'Matriz' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-purple-700 hover:bg-purple-800';

  const filteredNames = useMemo(() => {
    if (!nameSearch) return inventoryConfig.productNames;
    return inventoryConfig.productNames.filter(n => n.toUpperCase().includes(nameSearch.toUpperCase()));
  }, [inventoryConfig.productNames, nameSearch]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return inventoryConfig.brands;
    return inventoryConfig.brands.filter(b => b.toUpperCase().includes(brandSearch.toUpperCase()));
  }, [inventoryConfig.brands, brandSearch]);

  const handleCatalogSelectFromCombobox = (name: string) => {
    form.setValue("productId", "new");
    form.setValue("newName", name.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 border-none overflow-hidden">
        <DialogHeader className="p-4 bg-muted/20 border-b">
          <DialogTitle className={cn("text-base font-black uppercase flex items-center gap-2", branchColor)}>
            <SendHorizontal className="w-4 h-4" /> Entrega Administrativa - {branch}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[85vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
              
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24 rounded-lg border-2 border-primary/10">
                    <AvatarImage src={previewUrl || ''} className="object-cover" />
                    <AvatarFallback className="bg-muted text-muted-foreground rounded-lg flex flex-col items-center justify-center">
                      <Camera className="w-6 h-6 opacity-30" />
                      <span className="text-[8px] font-black uppercase mt-1">Sin Foto</span>
                    </AvatarFallback>
                  </Avatar>
                  {isNewProduct && (
                    <Button 
                      type="button"
                      variant="secondary" 
                      size="icon" 
                      className="absolute -bottom-1 -right-1 rounded-md h-7 w-7 shadow-lg bg-primary text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-[10px] uppercase text-muted-foreground">Producto / Insumo</FormLabel>
                      <FormControl>
                        <ProductSearchCombobox 
                          products={products} 
                          catalogNames={inventoryConfig.productNames}
                          value={field.value} 
                          onChange={field.onChange} 
                          onCatalogSelect={handleCatalogSelectFromCombobox}
                          placeholder="BUSCAR..." 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-[10px] uppercase text-muted-foreground">Destino Stock</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs font-bold uppercase">
                            <SelectValue placeholder="Seleccionar destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BODEGA" className="text-xs font-bold">BODEGA (STOCK)</SelectItem>
                          <SelectItem value="ESTABLECIMIENTO" className="text-xs font-bold">CABINA (ESTABLECIMIENTO)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {isNewProduct && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border border-dashed animate-in fade-in">
                  <div className="col-span-full font-black text-[9px] uppercase text-primary">Ficha Técnica Nuevo Producto</div>
                  
                  {isDuplicateName && (
                    <div className="col-span-full mb-2">
                      <Alert className="bg-orange-50 border-orange-200 py-1.5">
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                        <AlertDescription className="text-[9px] font-black text-orange-800 uppercase leading-tight">
                          ESTE INSUMO YA EXISTE. PUEDES REGISTRAR UNA NUEVA VARIANTE CAMBIANDO LA MARCA.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <FormField border-orange-200 control={form.control} name="newName" render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel className="text-[9px] font-bold uppercase">Nombre del Insumo</FormLabel>
                      <Popover open={isNamePopoverOpen} onOpenChange={setIsNamePopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-black uppercase h-8 text-[10px]",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Seleccionar nombre..."}
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Escribir nombre..." value={nameSearch} onValueChange={setNameSearch} className="h-8 text-xs" />
                            <CommandList>
                              {nameSearch.length > 0 && (
                                <CommandGroup>
                                  <CommandItem onSelect={() => { field.onChange(nameSearch.toUpperCase()); setIsNamePopoverOpen(false); }} className="text-[10px] font-black uppercase text-primary">
                                    <Plus className="mr-2 h-3 w-3" /> USAR: "{nameSearch.toUpperCase()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              <CommandGroup heading="Catálogo de Nombres">
                                {filteredNames.map((name) => (
                                  <CommandItem key={name} value={name} onSelect={() => { field.onChange(name); setIsNamePopoverOpen(false); }} className="text-[10px] font-bold uppercase">
                                    <Check className={cn("mr-2 h-3 w-3", name === field.value ? "opacity-100" : "opacity-0")} />
                                    {name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="newBrand" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase">Marca</FormLabel>
                      <Popover open={isBrandPopoverOpen} onOpenChange={setIsBrandPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between font-bold h-8 text-[10px] uppercase", !field.value && "text-muted-foreground")}>
                              {field.value || "Marca..."}
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Escribir marca..." value={brandSearch} onValueChange={setBrandSearch} className="h-8 text-xs" />
                            <CommandList>
                              {brandSearch.length > 0 && (
                                <CommandGroup>
                                  <CommandItem onSelect={() => { field.onChange(brandSearch.toUpperCase()); setIsBrandPopoverOpen(false); }} className="text-[10px] font-black uppercase text-primary">
                                    <Plus className="mr-2 h-3 w-3" /> USAR: "{brandSearch.toUpperCase()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              <CommandGroup heading="Marcas Registradas">
                                {filteredBrands.map(b => (
                                  <CommandItem key={b} value={b} onSelect={() => { field.onChange(b); setIsBrandPopoverOpen(false); }} className="text-[10px] uppercase font-bold">
                                    <Check className={cn("mr-2 h-3 w-3", b === field.value ? "opacity-100" : "opacity-0")} />
                                    {b}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase">Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {inventoryConfig.categories.map(c => <SelectItem key={c} value={c} className="text-xs uppercase">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newUnit" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase">Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {inventoryConfig.units.map(u => <SelectItem key={u} value={u} className="text-xs uppercase">{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newPackageSize" render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-bold uppercase">Presentación</FormLabel><FormControl><Input {...field} placeholder="Ej. 500 ML" className="h-8 text-xs uppercase" /></FormControl></FormItem>
                  )} />
                </div>
              )}

              <div className="p-4 bg-muted/20 rounded-xl border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-black text-[10px] uppercase text-primary">Detalle de Costos</div>
                  <FormField
                    control={form.control}
                    name="hasIva"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-[9px] font-black uppercase cursor-pointer">MÁS IVA (15%)</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="unitPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase">Precio Unitario ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                          <Input type="number" step="0.001" {...field} className="h-9 pl-7 text-sm font-bold" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-[9px] uppercase">Cantidad Recibida</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} className="h-9 text-sm font-black text-center" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                  <FormField control={form.control} name="subtotal" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Subtotal</FormLabel>
                      <FormControl><Input {...field} readOnly className="h-8 text-xs font-bold bg-muted/30 border-none" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="totalWithIva" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase text-primary">Total Final</FormLabel>
                      <FormControl><Input {...field} readOnly className="h-8 text-sm font-black bg-primary/5 text-primary border-primary/20" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/10">
                <div className="col-span-full font-black text-[9px] uppercase text-muted-foreground mb-1">Información del Proveedor</div>
                <FormField control={form.control} name="commercialName" render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] font-bold uppercase">Proveedor Comercial</FormLabel><FormControl><Input {...field} className="h-8 text-xs uppercase" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] font-bold uppercase">Sitio Web / Catálogo</FormLabel><FormControl><div className="relative"><Globe className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><Input {...field} className="h-8 pl-7 text-[10px]" /></div></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="distributorPhone" render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] font-bold uppercase">Teléfono Principal</FormLabel><FormControl><Input {...field} className="h-8 text-xs" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="secondaryPhone" render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] font-bold uppercase">Teléfono Secundario</FormLabel><FormControl><Input {...field} className="h-8 text-xs" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="supplierAddress" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel className="text-[9px] font-bold uppercase">Dirección Local</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><Input {...field} className="h-8 pl-7 text-[10px] uppercase" /></div></FormControl></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-bold uppercase">Observaciones de la Entrega</FormLabel><FormControl><Input placeholder="..." {...field} className="h-8 text-xs" /></FormControl></FormItem>
              )} />

              <DialogFooter className="pt-2 border-t gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-[10px] font-bold uppercase h-8 flex-1">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} size="sm" className={cn("text-[10px] font-black uppercase text-white h-8 flex-1", branchBg)}>
                  {isSubmitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <SendHorizontal className="mr-1 h-3 w-3" />} Confirmar Entrega
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
