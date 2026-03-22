

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
import type { ActivityLog, Client } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, FileText } from 'lucide-react';

interface ClientActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

const getLogIcon = (action: string) => {
    if (action.toLowerCase().includes('importada')) {
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <Clock className="w-4 h-4 text-purple-500" />;
};


export function ClientActivityDialog({ isOpen, onOpenChange, client }: ClientActivityDialogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !client) return;

    const fetchLogs = async () => {
        setLoading(true);
        
        const queries = [];
        // Query by clientId for direct matches
        if (client.id) {
            queries.push(query(collection(db, 'activity_log'), where('clientId', '==', client.id)));
        }
        // Query by clientName for imported events that might not have an ID yet
        const clientFullName = `${client.name} ${client.lastName}`.trim();
        queries.push(query(collection(db, 'activity_log'), where('clientName', '==', clientFullName)));


        try {
            const querySnapshots = await Promise.all(queries.map(q => getDocs(q)));
            
            const logsMap = new Map<string, ActivityLog>();
            querySnapshots.forEach(snapshot => {
                snapshot.forEach((doc) => {
                    if (!logsMap.has(doc.id)) {
                        const data = doc.data();
                        logsMap.set(doc.id, {
                            id: doc.id,
                            ...data,
                            timestamp: data.timestamp.toDate(),
                        } as ActivityLog);
                    }
                });
            });

            const logsData = Array.from(logsMap.values());
            logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setLogs(logsData);
        } catch (error) {
            console.error("Error fetching client activity logs: ", error);
        } finally {
            setLoading(false);
        }
    };
    
    fetchLogs();

  }, [isOpen, client]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Actividad de {client?.name} {client?.lastName}</DialogTitle>
          <DialogDescription>
            Historial de acciones para el cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {loading ? (
            <p>Cargando registros...</p>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="p-4 flex items-start gap-4">
                  <div className="bg-secondary p-2 rounded-full mt-1">
                        {getLogIcon(log.action)}
                  </div>
                  <div>
                      <p className="font-medium">{log.action}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{log.userName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                    {format(log.timestamp, "d 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })}
                                </span>
                            </div>
                        </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              No hay registros de actividad para este cliente.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
