"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Mail, Copy, CheckCircle2, Clock, XCircle, Printer, FileCode } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Factura {
  id: string;
  tipo: 'electronica' | 'fisica';
  clienteNombre: string;
  clienteIdentificacion?: string;
  clienteEmail?: string;
  fecha: any;
  ambiente: string;
  estado: 'borrador' | 'enviada' | 'autorizada' | 'rechazada';
  claveAcceso?: string;
  secuencial?: string;
  total: number;
  subtotal0?: number;
  subtotal15?: number;
  ivaValor?: number;
  detalles?: any[];
  xmlFirmado?: string;
}

export default function FacturaDetallePage() {
  const params = useParams();
  const { toast } = useToast();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [showXml, setShowXml] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchFactura = async () => {
      try {
        const docRef = doc(db, 'facturas', params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFactura({ id: docSnap.id, ...docSnap.data() } as Factura);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFactura();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadXml = () => {
    if (!factura?.xmlFirmado) return;
    const blob = new Blob([factura.xmlFirmado], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${factura.claveAcceso?.substring(0, 20) || factura.id}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );

  if (!factura) return (
    <div className="container mx-auto py-20 text-center">
      <p className="text-muted-foreground font-bold">Factura no encontrada.</p>
      <Button asChild className="mt-4"><Link href="/facturacion">Volver</Link></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20 no-print-bg">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-container { 
            width: 210mm;
            min-height: 297mm;
            padding: 10mm !important;
            margin: 0 auto;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
          }
          .ride-card {
            border: 1px solid #000 !important;
            box-shadow: none !important;
          }
        }
        .ride-border { border: 1.5px solid #333; }
      `}</style>

      {/* Toolbar superior */}
      <div className="container mx-auto py-4 max-w-5xl no-print">
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/facturacion"><ArrowLeft className="w-4 h-4 mr-2" /> Atrás</Link>
            </Button>
            <Badge variant="secondary" className="font-bold">
               {factura.ambiente === 'pruebas' ? '🧪 Pruebas' : '✅ Producción'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowXml(!showXml)}>
                <FileCode className="w-4 h-4 mr-2" /> {showXml ? 'Cerrar XML' : 'Ver XML'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadXml}>
                <Download className="w-4 h-4 mr-2" /> XML
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-primary hover:bg-primary/90 font-bold">
                <Printer className="w-4 h-4 mr-2" /> Imprimir RIDE
            </Button>
          </div>
        </div>
      </div>

      {/* FORMATO RIDE OFICIAL */}
      <div className="container mx-auto py-4 max-w-5xl print-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* LADO IZQUIERDO: Info Emisor */}
          <div className="space-y-4">
            <div className="bg-white p-4 flex flex-col justify-center items-center min-h-[120px]">
               <img src="/logo.png" alt="ÉLAPÍEL" className="max-h-24 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')}  />
               <h2 className="text-3xl font-black text-[#ad1457] mt-2 italic drop-shadow-sm">ÉLAPÍEL</h2>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-neutral-800 space-y-1 text-xs">
              <p className="font-black text-sm">ESTEFANY BUCHELI</p>
              <p className="font-bold">ÉLAPÍEL</p>
              <div className="pt-2">
                <p className="font-black">Dirección Matriz:</p>
                <p>RIO COCA Y AVENIDA AMAZONAS</p>
              </div>
              <div className="pt-2">
                <p className="font-black italic">OBLIGADO A LLEVAR CONTABILIDAD: NO</p>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: Info SRI */}
          <div className="bg-white p-5 rounded-3xl border-2 border-neutral-800 space-y-3">
            <p className="text-sm font-black">R.U.C.: <span className="font-mono">1725885485001</span></p>
            <h1 className="text-2xl font-black tracking-widest border-b pb-1">FACTURA</h1>
            <p className="text-sm font-bold">No. <span className="font-mono">001-001-{factura.secuencial || '000000001'}</span></p>
            
            <div className="space-y-1">
              <p className="text-[10px] font-black leading-tight uppercase">Número de Autorización:</p>
              <p className="text-[9px] font-mono leading-none break-all">{factura.claveAcceso || 'PENDIENTE'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <p className="font-black uppercase">Fecha y Hora de Autorización:</p>
                <p>{factura.fecha?.toDate ? format(factura.fecha.toDate(), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="font-black uppercase">Ambiente:</p>
                <p className="font-bold">{factura.ambiente?.toUpperCase() || 'PRUEBAS'}</p>
              </div>
            </div>

            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase">Emisión: <span className="font-normal">NORMAL</span></p>
                <p className="text-[10px] font-black uppercase">Clave de Acceso:</p>
                {/* Visual Placeholder for Barcode - In print it uses the real one if we had a library, but here we simulate CSS style */}
                <div className="bg-neutral-100 h-14 w-full flex items-center justify-center border-t border-b border-black overflow-hidden relative">
                    <div className="flex h-full w-full items-end justify-center gap-[1px] opacity-80">
                        {Array.from({length: 60}).map((_, i) => (
                            <div key={i} className="bg-black" style={{ width: Math.random() > 0.3 ? '1px' : '2px', height: `${Math.random() * 40 + 60}%` }} />
                        ))}
                    </div>
                </div>
                <p className="text-[9px] font-mono text-center tracking-tighter">{factura.claveAcceso}</p>
            </div>
          </div>
        </div>

        {/* INFO COMPRADOR */}
        <div className="mt-4 bg-white p-4 border-2 border-neutral-800 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="flex gap-2">
              <span className="font-black whitespace-nowrap">Razón Social / Nombres y Apellidos:</span>
              <span className="uppercase">{factura.clienteNombre}</span>
            </div>
            <div className="flex gap-2 md:justify-end">
              <span className="font-black">Identificación:</span>
              <span className="font-mono">{factura.clienteIdentificacion}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-black">Fecha Emisión:</span>
              <span>{format(new Date(), 'dd/MM/yyyy')}</span>
            </div>
             <div className="flex gap-2 md:justify-end">
              <span className="font-black">Guía Remisión:</span>
              <span>-</span>
            </div>
          </div>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="mt-4 border-2 border-neutral-800 overflow-hidden bg-white">
          <table className="w-full text-[10px] border-collapse">
            <thead className="bg-neutral-50">
              <tr className="border-b-2 border-neutral-800 font-black">
                <th className="p-2 border-r border-neutral-800 text-left">Cod. Principal</th>
                <th className="p-2 border-r border-neutral-800 text-center">Cant</th>
                <th className="p-2 border-r border-neutral-800 text-left">Descripción</th>
                <th className="p-2 border-r border-neutral-800 text-right">Precio Unitario</th>
                <th className="p-2 border-r border-neutral-800 text-right">Descuento</th>
                <th className="p-2 text-right">Precio Total</th>
              </tr>
            </thead>
            <tbody>
              {factura.detalles?.map((d, i) => (
                <tr key={i} className="border-b border-neutral-300 last:border-b-0">
                  <td className="p-2 border-r border-neutral-300">PROD-{i+1}</td>
                  <td className="p-2 border-r border-neutral-300 text-center">{d.cantidad}</td>
                  <td className="p-2 border-r border-neutral-300 uppercase">{d.descripcion}</td>
                  <td className="p-2 border-r border-neutral-300 text-right font-mono">${Number(d.precioUnitario).toFixed(2)}</td>
                  <td className="p-2 border-r border-neutral-300 text-right font-mono">$0.00</td>
                  <td className="p-2 text-right font-bold font-mono">${(d.cantidad * d.precioUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA: INFO ADICIONAL Y TOTALES */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          
          {/* Info Adicional */}
          <div className="border-2 border-neutral-800 p-3 bg-white space-y-2">
             <p className="text-xs font-black border-b pb-1 mb-2">Información Adicional</p>
             <div className="text-[10px] space-y-1">
                <p><span className="font-black">Email:</span> {factura.clienteEmail || '-'}</p>
                <p><span className="font-black">Dirección:</span> -</p>
                <p><span className="font-black">Teléfono:</span> -</p>
             </div>
          </div>

          {/* Cuadro de Totales */}
          <div className="border-2 border-neutral-800 overflow-hidden bg-white ml-auto w-full md:w-80">
             {[
               ['SUBTOTAL 15%', factura.subtotal15],
               ['SUBTOTAL 0%', factura.subtotal0],
               ['SUBTOTAL No objeto de IVA', 0],
               ['SUBTOTAL Exento de IVA', 0],
               ['SUBTOTAL SIN IMPUESTOS', (factura.subtotal0 || 0) + (factura.subtotal15 || 0)],
               ['TOTAL Descuento', 0],
               ['ICE', 0],
               ['IVA 15%', factura.ivaValor],
               ['IRBPNR', 0],
               ['PROPINA', 0],
               ['VALOR TOTAL', factura.total]
             ].map(([label, value], i) => (
                <div key={i} className="flex justify-between border-b last:border-b-0 text-[10px]">
                  <span className="p-1 px-2 font-black border-r border-neutral-300 flex-1">{label}</span>
                  <span className="p-1 px-2 font-mono text-right w-24">${Number(value).toFixed(2)}</span>
                </div>
             ))}
          </div>
        </div>

        {/* XML VIEWER (No print) */}
        {showXml && (
          <div className="mt-10 no-print">
             <h3 className="text-lg font-bold mb-2">XML Firmado</h3>
             <pre className="bg-neutral-900 text-emerald-400 p-6 rounded-2xl text-xs overflow-auto max-h-[500px]">
                {factura.xmlFirmado}
             </pre>
          </div>
        )}
      </div>
    </div>
  );
}
