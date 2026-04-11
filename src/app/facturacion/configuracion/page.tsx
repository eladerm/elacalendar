"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ConfiguracionSRI {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionMatriz: string;
  obligadoContabilidad: boolean;
  ambiente: 'pruebas' | 'produccion';
  p12Password: string;
}

export default function ConfiguracionSRIPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ConfiguracionSRI>({
    defaultValues: {
      ambiente: 'pruebas',
      obligadoContabilidad: false
    }
  });

  const watchAmbiente = watch('ambiente');
  const watchObligado = watch('obligadoContabilidad');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'configuracion', 'sri');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as ConfiguracionSRI;
          Object.entries(data).forEach(([key, value]) => {
            setValue(key as keyof ConfiguracionSRI, value);
          });
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      } finally {
        // Wait artificial to prevent flashing loader
        setTimeout(() => setInitialLoading(false), 500);
      }
    };

    fetchConfig();
  }, [setValue]);

  const onSubmit = async (data: ConfiguracionSRI) => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'configuracion', 'sri'), data, { merge: true });
      toast({
        title: "Configuración Guardada",
        description: "Los parámetros del SRI se han actualizado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl relative min-h-screen">
      
      {initialLoading && (
         <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary shadow-lg shadow-primary/20"></div>
         </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="hover:bg-primary/10 hover:text-primary transition-colors">
            <Link href="/facturacion">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Configuración de Emisor (SRI)
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              Establece los datos de la empresa y credenciales para firmar electrónicamente.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Company Infomation */}
        <Card className="border-t-4 border-t-primary shadow-lg shadow-primary/5 rounded-2xl">
          <CardHeader className="bg-muted/20 border-b border-border/50">
            <CardTitle className="text-xl font-bold">Datos Tributarios</CardTitle>
            <CardDescription>Información del contribuyente registrada en el SRI.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="space-y-2">
              <Label className="font-bold text-foreground">RUC <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="1790000000001" 
                maxLength={13} 
                className="font-medium bg-background border-primary/20 hover:border-primary/50 focus:border-primary focus:ring-primary/20 transition-all rounded-xl"
                {...register('ruc', { required: true, minLength: 13, maxLength: 13 })} 
              />
              {errors.ruc && <span className="text-xs font-bold text-red-500">RUC inválido (13 dígitos)</span>}
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-foreground">Razón Social <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Empresa S.A." 
                className="font-medium rounded-xl"
                {...register('razonSocial', { required: true })} 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-bold text-foreground">Nombre Comercial</Label>
              <Input 
                placeholder="Mi Negocio" 
                className="font-medium rounded-xl"
                {...register('nombreComercial')} 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-bold text-foreground">Dirección Matriz <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Av. Principal y Secundaria" 
                className="font-medium rounded-xl"
                {...register('direccionMatriz', { required: true })} 
              />
            </div>

            <div className="space-y-2 flex items-center justify-between p-4 border border-border/50 rounded-xl bg-muted/10 md:col-span-2 hover:border-primary/30 transition-colors">
               <div className="space-y-0.5">
                  <Label className="font-bold text-foreground text-sm">Obligado a llevar contabilidad</Label>
                  <p className="text-xs text-muted-foreground font-medium">Marca esta opción si tu RUC está designado a llevar contabilidad por el SRI.</p>
               </div>
               <Switch 
                  checked={watchObligado}
                  onCheckedChange={(checked) => setValue('obligadoContabilidad', checked)}
               />
            </div>
          </CardContent>
        </Card>

        {/* Technical/Security Information */}
        <Card className="shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50">
            <CardTitle className="text-xl font-bold">Emisión y Firma (.p12)</CardTitle>
            <CardDescription>Parámetros para realizar la transmisión al sistema del SRI.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="space-y-2">
              <Label className="font-bold text-foreground text-sm">Ambiente de Emisión <span className="text-red-500">*</span></Label>
              <Select value={watchAmbiente} onValueChange={(value: 'pruebas'|'produccion') => setValue('ambiente', value)}>
                <SelectTrigger className="w-full rounded-xl font-bold">
                  <SelectValue placeholder="Seleccionar Entorno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pruebas" className="font-bold text-indigo-700">Pruebas</SelectItem>
                  <SelectItem value="produccion" className="font-bold text-rose-700">Producción</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground italic font-medium pt-1">Producción emitirá facturas reales con validez tributaria.</p>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-foreground text-sm">Contraseña de la Firma (.p12)</Label>
              <Input 
                type="password" 
                placeholder="••••••••••" 
                className="font-medium rounded-xl border-primary/20 hover:border-primary/50 focus:border-primary transition-all"
                {...register('p12Password', { required: true })} 
              />
              <p className="text-[11px] flex gap-1 items-center text-primary/80 italic font-bold pt-1">
                 <ShieldCheck className="w-3 h-3" />
                 Se almacenará encriptada
              </p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label className="font-bold text-foreground text-sm">Archivo de Firma (.p12)</Label>
              <div className="border-2 border-dashed border-primary/30 bg-primary/5 p-6 rounded-xl text-center hover:bg-primary/10 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-bold text-sm">Clic para subir el archivo de firma electrónica</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Soporta formatos: .p12</p>
                  <p className="text-xs text-primary font-bold mt-2 hover:underline">Solo el Administrador del Servidor puede realizar esto.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t border-border/50 py-4 flex justify-end gap-3 rounded-b-2xl">
              <Button type="button" variant="outline" asChild className="rounded-xl font-bold">
                 <Link href="/facturacion">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl font-bold min-w-32 shadow-md shadow-primary/20 hover:shadow-lg transition-all">
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Configuración
              </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
