
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Service } from '@/lib/types';


const serviceSchema = z.object({
  code: z.string().min(1, 'El código es requerido.'),
  name: z.string().min(1, 'El nombre del servicio es requerido.'),
  type: z.string().min(1, 'El tipo de servicio es requerido.'),
  duration: z.coerce.number().min(0, 'La duración debe ser un número positivo.'),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ServiceFormData) => void;
  initialData?: Service | null;
}

export function ServiceFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
}: ServiceFormDialogProps) {
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: '',
      name: '',
      type: '',
      duration: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset(initialData);
      } else {
        form.reset({
          code: '',
          name: '',
          type: '',
          duration: 0,
        });
      }
    }
  }, [isOpen, initialData, form]);
  
  const dialogTitle = initialData ? 'Editar Servicio' : 'Agregar Nuevo Servicio';
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. ELA01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Zona del Cuerpo</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Bigote" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Servicio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. DEPILACIÓN LÁSER" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiempo (minutos)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej. 15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
