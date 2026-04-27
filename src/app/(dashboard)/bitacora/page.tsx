
"use client";

import { useState, useEffect } from 'react';
import type { ActivityLog } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, FileText, AlertCircle, Camera, ChevronDown, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const getLogIcon = (action: string, hasPhoto: boolean) => {
    const act = action.toLowerCase();
    if (act.includes('importó')) {
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
    // Mostrar cámara si es inicio de sesión o intento fallido
    if (act.includes('inicio de sesión') || act.includes('intento fallido') || act.includes('denegado')) {
        return <Camera className={cn("w-4 h-4", hasPhoto ? "text-green-500 animate-pulse" : "text-muted-foreground/40")} />;
    }
    return <User className="w-4 h-4 text-muted-foreground" />;
};

export default function BitacoraPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const q = query(
        collection(db, 'activity_log'), 
        orderBy('timestamp', 'desc'),
        limit(displayLimit)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({ 
            ...data,
            id: doc.id, 
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        } as ActivityLog);
      });
      setLogs(logsData);
      setLoading(false);
    },
    (err) => {
        console.error("Error fetching activity log:", err);
        setError("Error de conexión o permisos insuficientes.");
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [displayLimit]);

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 100);
  };

  return (
    <div className="min-h-screen w-full bg-muted/10">
      
      <main className="container py-8">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Bitácora de Auditoría
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {loading && logs.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-50" />
                    <p className="text-muted-foreground font-bold uppercase text-xs">Cargando registros...</p>
                </div>
            ) : logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <Card key={log.id} className="p-4 flex items-center justify-between gap-4 border-none bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                        <div 
                            className={cn(
                                "p-2 rounded-full shadow-sm mt-1 border transition-all",
                                log.loginPhoto 
                                  ? "cursor-pointer bg-green-50 border-green-200 hover:scale-110 active:scale-95 shadow-green-100" 
                                  : "bg-white"
                            )}
                            onClick={() => log.loginPhoto && setSelectedPhoto(log.loginPhoto)}
                            title={log.loginPhoto ? "Haga clic para ver evidencia fotográfica" : undefined}
                        >
                            {getLogIcon(log.action, !!log.loginPhoto)}
                        </div>
                        <div>
                            <p className={cn("font-bold text-sm", log.action.includes('fallido') ? "text-destructive" : "text-foreground")}>
                                {log.action}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-primary" />
                                    <span className="font-black uppercase">{log.userName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                        {format(log.timestamp, "d MMM, yyyy HH:mm:ss", { locale: es })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {log.loginPhoto && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 text-green-700 font-bold border-green-200 bg-green-50 hover:bg-green-100 transition-all shadow-sm"
                            onClick={() => setSelectedPhoto(log.loginPhoto!)}
                        >
                            <Camera className="w-4 h-4" />
                            <span className="hidden sm:inline">Ver Foto</span>
                        </Button>
                    )}
                  </Card>
                ))}

                <div className="pt-6 flex justify-center">
                    <Button 
                        variant="outline" 
                        onClick={handleLoadMore} 
                        disabled={loading}
                        className="font-black uppercase text-[10px] h-10 px-8 border-primary/20 text-primary hover:bg-primary/5"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                        Cargar más registros
                    </Button>
                </div>
              </div>
            ) : (
                !error && !loading && <div className="py-20 text-center text-muted-foreground italic font-medium">No hay registros de actividad.</div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Visor de Foto de Seguridad Ampliado */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-black/95 shadow-2xl">
          <DialogHeader className="p-4 bg-white/10 backdrop-blur-md border-b border-white/10 text-white">
            <DialogTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Evidencia de Acceso - ÉLAPIEL
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center p-6 min-h-[300px]">
            {selectedPhoto && (
              <img 
                src={selectedPhoto} 
                alt="Evidencia fotográfica" 
                className="rounded-lg shadow-2xl border-2 border-white/20 animate-in zoom-in-95 duration-300 w-full object-cover aspect-[4/3]" 
              />
            )}
          </div>
          <div className="p-4 bg-white/10 backdrop-blur-md flex justify-between items-center">
            <p className="text-[9px] text-white/60 font-bold uppercase">Registro de Auditoría Centralizado</p>
            <Button variant="outline" onClick={() => setSelectedPhoto(null)} className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-black uppercase text-[10px]">
                Cerrar Visor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
