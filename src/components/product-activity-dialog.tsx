
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import type { ActivityLog } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Package } from 'lucide-react';

interface ProductActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productIds: string[];
}

export function ProductActivityDialog({ isOpen, onOpenChange, productName, productIds }: ProductActivityDialogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !productIds || productIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Consultamos la bitácora buscando cualquiera de los IDs relacionados (Bodega o Cabina)
    const q = query(
      collection(db, 'activity_log'),
      where('productId', 'in', productIds)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as ActivityLog);
      });
      
      // Ordenamos por fecha descendente localmente para evitar errores de índice en Firestore
      logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching product activity logs: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, productIds]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Package className="w-5 h-5" />
            <DialogTitle className="text-xl">Historial: {productName}</DialogTitle>
          </div>
          <DialogDescription>
            Registro de quién abrió, terminó o movió unidades de este producto.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground italic">Cargando historial...</div>
          ) : logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="p-4 border-none bg-muted/30">
                  <p className="font-semibold text-sm leading-snug">{log.action}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" />
                      <span className="font-bold uppercase">{log.userName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(log.timestamp, "d MMM, HH:mm 'hrs'", { locale: es })}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm font-medium">
                No hay movimientos registrados para este producto todavía.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
