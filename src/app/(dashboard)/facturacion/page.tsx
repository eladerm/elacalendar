"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ReceiptText, Settings, FileText, FileDown, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

interface Factura {
  id: string;
  tipo: 'electronica' | 'fisica';
  clienteNombre: string;
  fecha: any;
  ambiente: 'pruebas' | 'produccion';
  estado: 'borrador' | 'enviada' | 'autorizada' | 'rechazada';
  claveAcceso?: string;
  total: number;
  pdfUrl?: string;
  xmlUrl?: string;
}

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        const q = query(collection(db, 'facturas'), orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Factura[];
        
        setFacturas(data);
      } catch (error) {
        console.error("Error fetching facturas:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchFacturas();
    }
  }, [user]);

  const getStatusBadge = (estado: Factura['estado']) => {
    switch(estado) {
      case 'autorizada':
        return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Autorizada</Badge>;
      case 'enviada':
        return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Enviada</Badge>;
      case 'rechazada':
        return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rechazada</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Borrador</Badge>;
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl animate-in fade-in zoom-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-background to-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ReceiptText className="w-8 h-8 text-primary" />
            Facturación y Comprobantes
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Gestiona la facturación electrónica (SRI) y los comprobantes físicos.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
            <Link href="/facturacion/configuracion">
              <Settings className="w-4 h-4 mr-2" />
              Configuración SRI
            </Link>
          </Button>
          <Button asChild className="bg-primary/90 hover:bg-primary shadow-md shadow-primary/20 transition-all group">
            <Link href="/facturacion/nueva?tipo=electronica">
              <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Factura Electrónica
            </Link>
          </Button>
          <Button variant="secondary" asChild className="shadow-sm hover:shadow-md transition-all group">
            <Link href="/facturacion/nueva?tipo=fisica">
              <FileText className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Comprobante Físico
            </Link>
          </Button>
        </div>
      </div>

      {/* Facturas List */}
      <Card className="border-primary/5 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
             Historial de Emisiones
          </CardTitle>
          <CardDescription>
            Todas las facturas emitidas y sus estados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-20 px-4 bg-gradient-to-b from-transparent to-primary/5">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ReceiptText className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-bold">No hay comprobantes emitidos</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto mb-6">
                Aún no has emitido ninguna factura o comprobante. Comienza creando tu primera emisión.
              </p>
              <Button asChild>
                <Link href="/facturacion/nueva?tipo=electronica">
                  Crear Primera Factura
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {facturas.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-6 py-4 font-medium">
                        {f.fecha?.toDate ? format(f.fecha.toDate(), 'dd MMM yyyy HH:mm', { locale: es }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {f.clienteNombre}
                      </td>
                      <td className="px-6 py-4">
                        {f.tipo === 'electronica' ? (
                            <span className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit border border-indigo-100 uppercase">
                                <FileText className="w-3 h-3 mr-1" /> SRI Electrónica
                            </span>
                        ) : (
                            <span className="flex items-center text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md w-fit border border-orange-100 uppercase">
                                <ReceiptText className="w-3 h-3 mr-1" /> Físico
                            </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-black text-primary">
                        ${f.total?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4">
                        {f.tipo === 'electronica' ? getStatusBadge(f.estado) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {f.pdfUrl && (
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:text-primary hover:bg-primary/10">
                                    <a href={f.pdfUrl} target="_blank" rel="noreferrer" title="Descargar PDF">
                                        <FileDown className="w-4 h-4" />
                                    </a>
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:text-primary hover:bg-primary/10">
                                <Link href={`/facturacion/${f.id}`} title="Ver Detalle">
                                    <Eye className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
