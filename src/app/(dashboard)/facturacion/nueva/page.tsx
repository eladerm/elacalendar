"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Save, ArrowLeft, Plus, Trash2, Send, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ClientSearchCombobox } from '@/components/client-search-combobox';
import type { Client } from '@/lib/types';

interface DetalleFactura {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  iva: boolean;
}

interface FacturaForm {
  clienteId: string;
  clienteNombre: string;
  clienteIdentificacion: string;
  clienteEmail: string;
  detalles: DetalleFactura[];
}

export default function NuevaFacturaPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tipoParam = searchParams.get('tipo') as 'electronica' | 'fisica' || 'electronica';
  
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clienteEmail, setClienteEmail] = useState('');

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FacturaForm>({
    defaultValues: {
      detalles: [{ descripcion: '', cantidad: 1, precioUnitario: 0, iva: true }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "detalles" });
  const watchDetalles = watch("detalles");

  useEffect(() => {
    const fetchClientes = async () => {
      const q = query(collection(db, 'clients'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
      setClientes(data.filter(c => (c as any).status !== 'inactive'));
    };
    fetchClientes();
  }, []);

  // Auto-completar email cuando se selecciona cliente
  useEffect(() => {
    if (selectedClient?.email) {
      setClienteEmail(selectedClient.email);
    }
  }, [selectedClient]);

  const subtotales = useMemo(() => {
    let subtotal0 = 0;
    let subtotal15 = 0;
    watchDetalles.forEach(d => {
      const lineTotal = (d.cantidad || 0) * (d.precioUnitario || 0);
      if (d.iva) subtotal15 += lineTotal;
      else subtotal0 += lineTotal;
    });
    const subtotal = subtotal0 + subtotal15;
    const ivaValor = subtotal15 * 0.15;
    const total = subtotal + ivaValor;
    return { subtotal, subtotal0, subtotal15, ivaValor, total };
  }, [watchDetalles]);

  const onSubmit = async (data: FacturaForm) => {
    if (!selectedClient) {
      toast({ title: "Falta Cliente", description: "Selecciona un cliente para emitir el comprobante.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tipo: tipoParam,
        clienteId: selectedClient.id,
        clienteNombre: `${selectedClient.name} ${selectedClient.lastName || ''}`.trim(),
        clienteIdentificacion: selectedClient.idNumber || '9999999999999',
        clienteEmail: clienteEmail || null,
        detalles: data.detalles,
        ...subtotales
      };

      if (tipoParam === 'electronica') {
        const response = await fetch('/api/sri/emitir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al conectar con SRI');

        // Si hay email, enviar el XML por correo
        if (clienteEmail && result.xmlContent) {
          try {
            await fetch('/api/sri/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                destinatario: clienteEmail,
                claveAcceso: result.claveAcceso,
                clienteNombre: payload.clienteNombre,
                total: subtotales.total,
                xmlContent: result.xmlContent,
              })
            });
            toast({ title: "✅ Factura Enviada", description: `Email con XML enviado a ${clienteEmail}` });
          } catch {
            toast({ title: "Factura Enviada (sin email)", description: "La factura fue al SRI pero no se pudo enviar el email.", variant: "default" });
          }
        } else {
          toast({ title: "✅ Factura Enviada al SRI", description: `Clave: ${result.claveAcceso?.substring(0, 20)}...` });
        }

        router.push('/facturacion');

      } else {
        // Comprobante Físico - guardar directo en Firestore cliente
        const { addDoc, doc: firestoreDoc, setDoc, serverTimestamp, collection: firestoreCollection } = await import('firebase/firestore');
        const docRef = firestoreDoc(firestoreCollection(db, 'facturas'));
        await setDoc(docRef, {
          ...payload,
          ambiente: 'local',
          estado: 'autorizada',
          fecha: serverTimestamp(),
        });
        toast({ title: "✅ Comprobante Guardado", description: "El comprobante físico se guardó correctamente." });
        router.push('/facturacion');
      }

    } catch (error: any) {
      console.error(error);
      toast({ title: "Error en Emisión", description: error.message || "Ocurrió un error inesperado.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl animate-in fade-in zoom-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-gradient-to-r from-background to-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="hover:bg-primary/10 hover:text-primary transition-colors">
            <Link href="/facturacion"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              {tipoParam === 'electronica' ? 'Nueva Factura Electrónica' : 'Nuevo Comprobante Físico'}
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              {tipoParam === 'electronica' ? 'Se enviará al SRI en ambiente de Pruebas' : 'Se guardará como comprobante interno'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Cliente */}
        <Card className="border-t-4 border-t-primary shadow-lg shadow-primary/5 rounded-2xl">
          <CardHeader className="bg-muted/20 border-b border-border/50">
            <CardTitle className="text-xl font-bold">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-bold text-foreground">Seleccionar Cliente</Label>
                <ClientSearchCombobox 
                  clients={clientes}
                  value={selectedClient?.id || ''}
                  onChange={(val) => {
                    if (val === 'new') {
                      toast({ title: "Próximamente", description: "La creación de clientes desde esta vista estará lista pronto." });
                      return;
                    }
                    const c = clientes.find(client => client.id === val);
                    setSelectedClient(c || null);
                  }}
                />
                {selectedClient && (
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                    <p className="text-sm font-bold">Cédula/RUC: <span className="text-muted-foreground font-mono">{selectedClient.idNumber || 'Consumidor Final'}</span></p>
                    <p className="text-sm font-bold">Nombre: <span className="text-muted-foreground">{selectedClient.name} {selectedClient.lastName || ''}</span></p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email para envío del comprobante
                </Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  className="h-11 rounded-xl font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  Se enviará el XML firmado a este correo. Se autocompleta si el cliente tiene email registrado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles */}
        <Card className="shadow-lg shadow-black/5 rounded-2xl">
          <CardHeader className="bg-muted/20 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Detalle de Productos/Servicios</CardTitle>
              <CardDescription>Agrega los items de la transacción.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ descripcion: '', cantidad: 1, precioUnitario: 0, iva: true })} className="font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-1" /> Fila
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="hidden md:grid grid-cols-12 gap-4 px-2 uppercase text-xs font-black text-muted-foreground tracking-wider">
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2 text-right">Precio U.</div>
                <div className="col-span-2 text-center">IVA 15%</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const lineTotal = (watchDetalles[index]?.cantidad || 0) * (watchDetalles[index]?.precioUnitario || 0);
                return (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-muted/10 p-4 md:p-2 rounded-xl border md:border-none">
                    <div className="md:col-span-1">
                      <Label className="md:hidden text-xs">Cantidad</Label>
                      <Input type="number" step="1" {...register(`detalles.${index}.cantidad` as const, { valueAsNumber: true })} className="text-center font-bold" />
                    </div>
                    <div className="md:col-span-5">
                      <Label className="md:hidden text-xs">Descripción</Label>
                      <Input placeholder="Item..." {...register(`detalles.${index}.descripcion` as const)} className="font-medium" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="md:hidden text-xs">P. Unitario ($)</Label>
                      <Input type="number" step="0.01" {...register(`detalles.${index}.precioUnitario` as const, { valueAsNumber: true })} className="text-right font-bold font-mono" />
                    </div>
                    <div className="md:col-span-2 flex justify-center items-center gap-2">
                      <Label className="md:hidden text-xs">Aplica IVA</Label>
                      <input type="checkbox" {...register(`detalles.${index}.iva` as const)} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary" />
                    </div>
                    <div className="md:col-span-1 text-right font-black font-mono text-primary">
                      ${lineTotal.toFixed(2)}
                    </div>
                    <div className="md:col-span-1 text-right md:text-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end px-2">
              <div className="w-full md:w-1/3 space-y-3 bg-muted/20 p-5 rounded-xl border border-border/50">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground">Subtotal 15%</span>
                  <span>${subtotales.subtotal15.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground">Subtotal 0%</span>
                  <span>${subtotales.subtotal0.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">IVA 15%</span>
                  <span>${subtotales.ivaValor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-black text-primary pt-1">
                  <span>TOTAL</span>
                  <span className="font-mono">${subtotales.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="bg-muted/10 border-t border-border/50 py-4 flex justify-end gap-3 rounded-b-2xl">
            <Button type="button" variant="outline" asChild className="rounded-xl font-bold">
              <Link href="/facturacion">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl font-bold min-w-40 shadow-md shadow-primary/20 hover:shadow-lg transition-all">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : tipoParam === 'electronica' ? (
                <Send className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {tipoParam === 'electronica' ? (clienteEmail ? 'Emitir y Enviar Email' : 'Emitir a SRI') : 'Guardar Físico'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
