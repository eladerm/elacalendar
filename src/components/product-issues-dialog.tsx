
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import type { ActivityLog } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Clock, User, MessageSquareText } from 'lucide-react';
import { Button } from './ui/button';

interface ProductIssuesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productIds: string[];
}

export function ProductIssuesDialog({ isOpen, onOpenChange, productName, productIds }: ProductIssuesDialogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !productIds || productIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const q = query(
      collection(db, 'activity_log'),
      where('productId', 'in', productIds)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtramos solo los logs que contienen novedades
        if (data.action.includes('NOVEDAD:')) {
            logsData.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp.toDate(),
            } as ActivityLog);
        }
      });
      
      logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching product issue logs: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, productIds]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertCircle className="w-5 h-5" />
            <DialogTitle className="text-xl">Reporte de Novedades: {productName}</DialogTitle>
          </div>
          <DialogDescription>
            Listado de observaciones registradas durante las transferencias.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground italic">Cargando reportes...</div>
          ) : logs.length > 0 ? (
            logs.map((log) => {
              const noveltyPart = log.action.split('NOVEDAD:')[1];
              return (
                <Card key={log.id} className="p-4 border-l-4 border-l-destructive bg-destructive/5">
                  <div className="flex items-start gap-2">
                      <MessageSquareText className="w-4 h-4 text-destructive mt-1 shrink-0" />
                      <div>
                          <p className="font-bold text-sm text-destructive uppercase tracking-tight mb-1">Observación:</p>
                          <p className="text-sm leading-relaxed italic">"{noveltyPart.trim()}"</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-4 border-t pt-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
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
              );
            })
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm font-medium">
                No se han encontrado observaciones detalladas.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full font-bold uppercase text-xs">Cerrar Reporte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
