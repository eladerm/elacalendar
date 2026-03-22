
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
} from 'firebase/firestore';
import type { ActivityLog, User } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';

interface UserActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function UserActivityDialog({ isOpen, onOpenChange, user }: UserActivityDialogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user || !user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'activity_log'),
      where('userId', '==', user.id)
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
      // Sort logs by date client-side
      logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching activity logs: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Actividad de {user?.name || 'Usuario'}</DialogTitle>
          <DialogDescription>
            Aquí se muestran las acciones realizadas por el usuario.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {loading ? (
            <p>Cargando registros...</p>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <p className="font-medium">{log.action}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(log.timestamp, "d 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              No hay registros de actividad para este usuario.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
