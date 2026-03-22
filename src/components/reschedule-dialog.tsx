
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Event } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface RescheduleInfo {
  event: Event;
  newStartDate: Date;
  newEndDate: Date;
}

interface RescheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rescheduleInfo: RescheduleInfo | null;
  onConfirm: (details: { reason: string; lateMinutes: number }) => void;
}

export function RescheduleDialog({
  isOpen,
  onOpenChange,
  rescheduleInfo,
  onConfirm,
}: RescheduleDialogProps) {
  const [reason, setReason] = useState('');
  const [lateMinutes, setLateMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setLateMinutes(rescheduleInfo?.event.lateMinutes?.toString() || '');
    }
  }, [isOpen, rescheduleInfo]);

  const handleSubmit = () => {
    if (!reason.trim()) {
        setError('El motivo del cambio es obligatorio.');
        return;
    }
    setError(null);
    onConfirm({ reason, lateMinutes: Number(lateMinutes) || 0 });
  };

  if (!rescheduleInfo) {
    return null;
  }

  const { event, newStartDate } = rescheduleInfo;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Reagendamiento</DialogTitle>
          <DialogDescription>
            Estás moviendo la cita de <strong>{event.clientName}</strong> del{' '}
            <strong>{format(event.startDate, "d MMM, HH:mm", { locale: es })}</strong> para el{' '}
            <strong>{format(newStartDate, "d MMM, HH:mm", { locale: es })}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del cambio (Requerido)</Label>
            <Textarea
              id="reason"
              placeholder={`Ej. El cliente solicitó cambiar la hora.`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="late-minutes">Minutos de Retraso (opcional)</Label>
            <Input
              id="late-minutes"
              type="number"
              placeholder="Ej. 15"
              value={lateMinutes}
              onChange={(e) => setLateMinutes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Confirmar Cambio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
