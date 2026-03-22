
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { db } from "@/lib/firebase";
import {
  collection,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  limit,
  runTransaction,
} from "firebase/firestore";
import type { Product } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Check, ChevronsUpDown, PackageSearch, Hash, Building2, AlertTriangle, Camera, Globe, MapPin, Phone, Plus, ListFilter, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  brand: z.string().optional(),
  code: z.string().optional(),
  category: z.string().min(1, "La categoría es requerida."),
  unit: z.string().min(1, "La unidad es requerida."),
  packageSize: z.string().optional(),
  observations: z.string().optional(),
  commercialName: z.string().optional(),
  distributorPhone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  supplierAddress: z.string().optional(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
  // Campos numéricos para administradores
  sealedCount: z.coerce.number().min(0).optional(),
  inUseCount: z.coerce.number().min(0).optional(),
  finishedCount: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Product | null;
  branch: "Matriz" | "Valle";
}

export function ProductFormDialog({
  isOpen,
  onOpenChange,
  initialData,
  branch,
}: ProductFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");

  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [existingUnits, setExistingUnits] = useState<string[]>([]);
  const [unitSearch, setUnitSearch] = useState("");

  const [isNameOpen, setIsNameOpen] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [nameSearch, setNameSearch] = useState("");

  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [existingBrands, setExistingBrands] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");

  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  const isAdmin = user?.role === 'administrador';

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      code: "",
      category: "",
      unit: "UNIDADES",
      packageSize: "",
      observations: "",
      commercialName: "",
      distributorPhone: "",
      secondaryPhone: "",
      supplierAddress: "",
      website: "",
      imageUrl: "",
      sealedCount: 0,
      inUseCount: 0,
      finishedCount: 0,
      minStock: 1,
    },
  });

  const nameValue = form.watch("name");
  const watchFields = form.watch(['name', 'brand', 'category', 'unit']);

  const isDuplicateName = useMemo(() => {
    if (!nameValue || initialData) return false;
    return existingNames.some(n => n.toUpperCase().trim() === nameValue.toUpperCase().trim());
  }, [nameValue, existingNames, initialData]);

  useEffect(() => {
    const [name, brand, category, unit] = watchFields;
    if (name && brand && category && unit) {
      const handler = setTimeout(async () => {
        try {
          const q = query(
            collection(db, "inventory"),
            where('name', '==', name.toUpperCase().trim()),
            where('brand', '==', brand.toUpperCase().trim()),
            where('category', '==', category.toUpperCase().trim()),
            where('unit', '==', unit.toUpperCase().trim()),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setDetectedCode(snap.docs[0].data().code);
          } else {
            setDetectedCode(null);
          }
        } catch (e) {
          console.error("Error detecting code:", e);
        }
      }, 500);
      return () => clearTimeout(handler);
    } else {
      setDetectedCode(null);
    }
  }, [watchFields]);

  useEffect(() => {
    if (!isOpen) return;
    
    const unsubSettings = onSnapshot(doc(db, 'inventory_config', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setExistingCategories(data.categories || []);
        setExistingUnits(data.units || []);
        setExistingNames(data.productNames || []);
        setExistingBrands(data.brands || []);
      }
    });

    return () => unsubSettings();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          name: initialData.name,
          brand: initialData.brand || "",
          code: initialData.code || "",
          category: initialData.category.toUpperCase(),
          unit: initialData.unit.toUpperCase(),
          packageSize: initialData.packageSize || "",
          observations: initialData.observations || "",
          commercialName: initialData.commercialName || "",
          distributorPhone: initialData.distributorPhone || "",
          secondaryPhone: initialData.secondaryPhone || "",
          supplierAddress: initialData.supplierAddress || "",
          website: initialData.website || "",
          imageUrl: initialData.imageUrl || "",
          sealedCount: initialData.sealedCount || 0,
          inUseCount: initialData.inUseCount || 0,
          finishedCount: initialData.finishedCount || 0,
          minStock: initialData.minStock || 1,
        });
        setPreviewUrl(initialData.imageUrl || null);
      } else {
        form.reset({
          name: "",
          brand: "",
          code: "",
          category: "",
          unit: "UNIDADES",
          packageSize: "",
          observations: "",
          commercialName: "",
          distributorPhone: "",
          secondaryPhone: "",
          supplierAddress: "",
          website: "",
          imageUrl: "",
          sealedCount: 0,
          inUseCount: 0,
          finishedCount: 0,
          minStock: 1,
        });
        setPreviewUrl(null);
      }
      setCategorySearch("");
      setUnitSearch("");
      setNameSearch("");
      setBrandSearch("");
      setDetectedCode(null);
    }
  }, [isOpen, initialData, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { 
        toast({
          title: "Archivo demasiado grande",
          description: "La foto no debe pesar más de 500KB.",
          variant: "destructive"
        });
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

  const onSubmit = async (data: ProductFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const name = data.name.toUpperCase().trim();
    const brand = (data.brand || "GENÉRICO").toUpperCase().trim();
    const category = data.category.toUpperCase().trim();
    const unit = data.unit.toUpperCase().trim();

    try {
      let finalCode = detectedCode || initialData?.code || "";

      await runTransaction(db, async (transaction) => {
        const settingsRef = doc(db, 'inventory_config', 'settings');
        const settingsSnap = await transaction.get(settingsRef);
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};

        let codeToSave = finalCode;

        if (!codeToSave) {
          const lastNumber = settingsData.lastCodeNumber || 0;
          const nextNumber = lastNumber + 1;
          codeToSave = `ST-${nextNumber.toString().padStart(4, '0')}`;
          transaction.update(settingsRef, { lastCodeNumber: nextNumber });
        }

        // Aprender nuevos metadatos
        const updatedBrands = Array.from(new Set([...(settingsData.brands || []), brand])).sort();
        const updatedCategories = Array.from(new Set([...(settingsData.categories || []), category])).sort();
        const updatedUnits = Array.from(new Set([...(settingsData.units || []), unit])).sort();
        const updatedProductNames = Array.from(new Set([...(settingsData.productNames || []), name])).sort();

        transaction.update(settingsRef, {
          brands: updatedBrands,
          categories: updatedCategories,
          units: updatedUnits,
          productNames: updatedProductNames
        });

        const productPayload: any = {
          name,
          brand,
          category,
          unit,
          code: codeToSave,
          packageSize: data.packageSize?.toUpperCase().trim() || "",
          observations: data.observations || "",
          commercialName: data.commercialName || "",
          distributorPhone: data.distributorPhone || "",
          secondaryPhone: data.secondaryPhone || "",
          supplierAddress: data.supplierAddress || "",
          website: data.website || "",
          imageUrl: data.imageUrl || "",
          lastUpdated: Timestamp.now()
        };

        // Solo permitir editar contadores si es administrador y está editando
        if (isAdmin && initialData) {
          productPayload.sealedCount = data.sealedCount ?? initialData.sealedCount;
          productPayload.inUseCount = data.inUseCount ?? initialData.inUseCount;
          productPayload.finishedCount = data.finishedCount ?? initialData.finishedCount;
          productPayload.minStock = data.minStock ?? initialData.minStock;
        }

        if (initialData) {
          const productRef = doc(db, "inventory", initialData.id);
          transaction.update(productRef, productPayload);
          
          // Registrar en bitácora si hubo ajustes manuales
          if (isAdmin) {
            const logRef = doc(collection(db, 'activity_log'));
            transaction.set(logRef, {
              userId: user?.id,
              userName: user?.name,
              action: `Ajustó manualmente inventario de "${name}" (${codeToSave}).`,
              timestamp: Timestamp.now(),
              productId: initialData.id
            });
          }
        } else {
          const newProductRef = doc(collection(db, "inventory"));
          transaction.set(newProductRef, {
            ...productPayload,
            branch,
            location: 'BODEGA',
            sealedCount: 0,
            inUseCount: 0,
            finishedCount: 0,
            minStock: 1,
          });

          const logRef = doc(collection(db, 'activity_log'));
          transaction.set(logRef, {
            userId: user?.id,
            userName: user?.name,
            action: `Agregó "${name}" (${codeToSave}) al inventario de ${branch}.`,
            timestamp: Timestamp.now(),
            productId: newProductRef.id
          });
        }
      });

      toast({ 
        title: initialData ? "Producto Actualizado" : "Producto Creado", 
        description: `Operación exitosa.` 
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Ocurrió un error al procesar la solicitud.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNames = useMemo(() => {
    if (!nameSearch) return existingNames;
    return existingNames.filter(n => n.toUpperCase().includes(nameSearch.toUpperCase()));
  }, [existingNames, nameSearch]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return existingBrands;
    return existingBrands.filter(b => b.toUpperCase().includes(brandSearch.toUpperCase()));
  }, [existingBrands, brandSearch]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return existingCategories;
    return existingCategories.filter(c => c.toUpperCase().includes(categorySearch.toUpperCase()));
  }, [existingCategories, categorySearch]);

  const filteredUnits = useMemo(() => {
    if (!unitSearch) return existingUnits;
    return existingUnits.filter(u => u.toUpperCase().includes(unitSearch.toUpperCase()));
  }, [existingUnits, unitSearch]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none bg-background shadow-2xl">
        <DialogHeader className="p-6 bg-muted/20 border-b">
          <DialogTitle className={cn("text-2xl font-black uppercase flex items-center gap-2", branch === 'Matriz' ? "text-pink-600" : "text-purple-700")}>
            <PackageSearch className="w-6 h-6" />
            {initialData ? "Editar Insumo" : "Registro de Nuevo Insumo"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
            
            <div className="flex flex-col items-center gap-4 mb-6 bg-muted/10 p-6 rounded-2xl border border-dashed">
              <div className="relative group">
                <Avatar className="h-32 w-32 rounded-xl border-4 border-primary/10 transition-all group-hover:border-primary/30">
                  <AvatarImage src={previewUrl || ''} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-primary rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="w-8 h-8 mb-1 opacity-40" />
                    <span className="text-[10px] font-black uppercase">Sin Foto</span>
                  </AvatarFallback>
                </Avatar>
                <Button 
                  type="button"
                  variant="secondary" 
                  size="icon" 
                  className="absolute -bottom-2 -right-2 rounded-lg h-10 w-10 shadow-xl border-2 border-background bg-primary text-white hover:bg-primary/90"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Identificación Visual del Insumo</p>
            </div>

            {/* SECCIÓN SOLO ADMIN: Edición de números actuales */}
            {isAdmin && initialData && (
              <div className="space-y-4 p-5 bg-primary/5 rounded-2xl border border-primary/20">
                <h3 className="text-sm font-black uppercase text-primary flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Ajuste Manual de Existencias (Admin)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="sealedCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[9px] uppercase text-muted-foreground">Sellados ({initialData.location === 'BODEGA' ? 'B' : 'C'})</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-10 font-black text-center" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inUseCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[9px] uppercase text-muted-foreground">En Uso</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-10 font-black text-center text-primary" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="finishedCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[9px] uppercase text-muted-foreground">Terminados</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-10 font-black text-center text-slate-600" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[9px] uppercase text-orange-600">Stock Mínimo</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-10 font-black text-center border-orange-200" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase italic text-center">
                  * Estos cambios sobrescriben directamente los contadores y se registrarán en auditoría.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-muted-foreground border-b pb-1 flex items-center gap-2">
                <Hash className="w-4 h-4" /> Identificación y Categoría
              </h3>

              {isDuplicateName && (
                <Alert className="bg-orange-50 border-orange-200 py-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-[10px] font-black text-orange-800 uppercase leading-tight">
                    ESTE INSUMO YA EXISTE. PUEDES REGISTRAR UNA NUEVA VARIANTE CAMBIANDO LA MARCA.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nombre del Producto</FormLabel>
                        <Popover open={isNameOpen} onOpenChange={setIsNameOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between font-black uppercase h-11",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value || "Seleccionar..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Escribir nombre..." 
                                value={nameSearch}
                                onValueChange={setNameSearch}
                              />
                              <CommandList>
                                {nameSearch.length > 0 && (
                                  <CommandGroup>
                                    <CommandItem onSelect={() => { field.onChange(nameSearch.toUpperCase()); setIsNameOpen(false); }} className="text-[10px] font-black uppercase text-primary">
                                      <Plus className="mr-2 h-3 w-3" /> USAR: "{nameSearch.toUpperCase()}"
                                    </CommandItem>
                                  </CommandGroup>
                                )}
                                <CommandGroup heading="Catálogo Estándar">
                                  {filteredNames.map((name) => (
                                    <CommandItem
                                      key={name}
                                      value={name}
                                      onSelect={() => {
                                        field.onChange(name);
                                        setIsNameOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", name === field.value ? "opacity-100" : "opacity-0")} />
                                      {name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormItem>
                  <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Código Interno</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                      <input 
                        value={detectedCode || initialData?.code || "AUTOGENERADO"} 
                        disabled 
                        className="flex h-11 w-full rounded-md border border-input bg-muted/50 px-3 py-2 pl-9 text-sm font-black border-dashed opacity-50 cursor-not-allowed" 
                      />
                    </div>
                  </FormControl>
                </FormItem>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Categoría</FormLabel>
                      <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-bold h-11 uppercase",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Seleccionar..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Buscar categoría..." 
                              value={categorySearch}
                              onValueChange={setCategorySearch}
                            />
                            <CommandList>
                              {categorySearch.length > 0 && (
                                <CommandGroup>
                                  <CommandItem onSelect={() => { field.onChange(categorySearch.toUpperCase()); setIsCategoryOpen(false); }} className="text-[10px] font-black uppercase text-primary">
                                    <Plus className="mr-2 h-3 w-3" /> USAR: "{categorySearch.toUpperCase()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              <CommandGroup>
                                {filteredCategories.map((cat) => (
                                  <CommandItem
                                    key={cat}
                                    value={cat}
                                    onSelect={() => {
                                      field.onChange(cat);
                                      setIsCategoryOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", cat === field.value ? "opacity-100" : "opacity-0")} />
                                    {cat}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Marca / Distribuidor</FormLabel>
                      <Popover open={isBrandOpen} onOpenChange={setIsBrandOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-bold h-11 uppercase",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Seleccionar..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Escribir marca..." 
                              value={brandSearch}
                              onValueChange={setBrandSearch}
                            />
                            <CommandList>
                              {brandSearch.length > 0 && (
                                <CommandGroup>
                                  <CommandItem onSelect={() => { field.onChange(brandSearch.toUpperCase()); setIsBrandOpen(false); }} className="text-[10px] font-black uppercase text-primary">
                                    <Plus className="mr-2 h-3 w-3" /> USAR: "{brandSearch.toUpperCase()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              <CommandGroup heading="Marcas Oficiales">
                                {filteredBrands.map((brand) => (
                                  <CommandItem
                                    key={brand}
                                    value={brand}
                                    onSelect={() => {
                                      field.onChange(brand);
                                      setIsBrandOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", brand === field.value ? "opacity-100" : "opacity-0")} />
                                    {brand}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-muted-foreground border-b pb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Presentación y Empaque
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Unidad de Medida</FormLabel>
                      <Popover open={isUnitOpen} onOpenChange={setIsUnitOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-bold h-11 uppercase",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Seleccionar..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Buscar unidad..." 
                              value={unitSearch}
                              onValueChange={setUnitSearch}
                            />
                            <CommandList>
                              {unitSearch.length > 0 && (
                                <CommandGroup>
                                  <CommandItem onSelect={() => { field.onChange(unitSearch.toUpperCase()); setIsUnitOpen(false); }} className="text-[10px] font-black uppercase text-primary">
                                    <Plus className="mr-2 h-3 w-3" /> USAR: "{unitSearch.toUpperCase()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              <CommandGroup>
                                {filteredUnits.map((u) => (
                                  <CommandItem
                                    key={u}
                                    value={u}
                                    onSelect={() => {
                                      field.onChange(u);
                                      setIsUnitOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", u === field.value ? "opacity-100" : "opacity-0")} />
                                    {u}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="packageSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Presentación (Ej. 500 ML)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. 250 CC" {...field} className="h-11 uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-muted-foreground border-b pb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Datos de Contacto y Enlaces
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="commercialName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nombre Comercial del Proveedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. DISTRIBUIDORA ÉLA" {...field} className="h-11 uppercase" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Página Web / Catálogo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="www.proveedor.com" {...field} className="h-11 pl-10" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="distributorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Teléfono Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="099..." {...field} className="h-11" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="secondaryPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Teléfono Secundario (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Otro contacto..." {...field} className="h-11" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Dirección del Local Comercial</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Calle, ciudad, sector..." {...field} className="h-11 pl-10 uppercase" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-muted-foreground border-b pb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Notas y Observaciones
              </h3>
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Instrucciones especiales o detalles del producto..." {...field} className="resize-none h-24" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t mt-6 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-bold">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className={cn("font-black uppercase tracking-tight shadow-lg min-w-[160px]", branch === 'Matriz' ? "bg-pink-600 hover:bg-pink-700" : "bg-purple-700 hover:bg-purple-800")}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {initialData ? "Guardar Cambios" : "Finalizar Registro"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
