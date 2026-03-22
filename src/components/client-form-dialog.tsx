
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Client } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  idNumber: z.string().optional(),
  email: z.string().email('El correo electrónico no es válido.').optional().or(z.literal('')),
  branch: z.enum(['ELAPIEL MATRIZ', 'ELAPIEL SAN RAFAEL', '']).optional(),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  treatmentType: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormData) => void;
  initialData?: Client | null;
}

export function ClientFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
}: ClientFormDialogProps) {
  const { user } = useAuth();
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      lastName: '',
      idNumber: '',
      email: '',
      branch: '',
      phone: '',
      gender: '',
      address: '',
      treatmentType: '',
    },
  });
  
  const isAdmin = user?.role === 'administrador';
  const canCreate = user?.permissions?.clientes?.crear;
  const canEdit = user?.permissions?.clientes?.editar;
  
  // Si es admin, no es solo lectura. 
  // Si no es admin, es solo lectura si (estamos editando y no tiene permiso editar) O (estamos creando y no tiene permiso crear)
  const isReadOnly = isAdmin ? false : (initialData ? !canEdit : !canCreate);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          name: initialData.name || '',
          lastName: initialData.lastName || '',
          idNumber: initialData.idNumber || '',
          email: initialData.email || '',
          branch: initialData.branch || '',
          phone: initialData.phone || '',
          birthDate: initialData.birthDate,
          gender: initialData.gender || '',
          address: initialData.address || '',
          treatmentType: initialData.treatmentType || '',
        });
      } else {
        form.reset({
            name: '',
            lastName: '',
            idNumber: '',
            email: '',
            branch: '',
            phone: '',
            birthDate: undefined,
            gender: '',
            address: '',
            treatmentType: '',
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleFormSubmit = (data: ClientFormData) => {
    onSubmit({
      ...data,
      name: data.name.toUpperCase(),
      lastName: data.lastName.toUpperCase(),
    });
  };
  
  const dialogTitle = initialData ? 'Editar Cliente' : 'Agregar Nuevo Cliente';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
           <fieldset disabled={isReadOnly} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Juan" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Pérez" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. juan@correo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. 55 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>No. de Cédula (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. 123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Nacimiento (Opcional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                ) : (
                                    <span>Elige una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                captionLayout="dropdown"
                                fromYear={1900}
                                toYear={new Date().getFullYear()}
                                locale={es}
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sexo (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sucursal (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una sucursal" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="ELAPIEL MATRIZ">ELAPIEL MATRIZ</SelectItem>
                        <SelectItem value="ELAPIEL SAN RAFAEL">ELAPIEL SAN RAFAEL</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Dirección (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Av. Siempre Viva 123" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="treatmentType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Tratamiento (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Facial, Corporal" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isReadOnly}>Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
