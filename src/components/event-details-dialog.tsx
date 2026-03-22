"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { addMinutes, format, setHours, setMinutes, parse, differenceInMinutes, isAfter, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc, Timestamp, onSnapshot, runTransaction, increment, deleteDoc, getDocs } from 'firebase/firestore';
import type { Event, Client, Service } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { CalendarIcon, Clock, Trash2, User as UserIcon, History, Ban, Building, Store, Tag, FileText, UserCircle, Send, CheckCircle, Briefcase, Bell, AlertCircle, AlertTriangle, X, CalendarClock, Save, Loader2 } from 'lucide-react';
import { ClientActivityDialog } from './event-activity-dialog';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { ClientSearchCombobox } from './client-search-combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Label } from './ui/label';
import { hexToRgba } from '@/lib/utils';

function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

const eventDetailsSchema = z.object({
  clientId: z.string().optional(),
  newClientName: z.string().optional(),
  newClientLastName: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  description: z.string().optional(),
  color: z.string().min(1, 'El color es requerido.'),
  amountPaid: z.coerce.number().optional().or(z.literal('')),
  sessionNumber: z.coerce.number().optional().or(z.literal('')),
  lateMinutes: z.coerce.number().optional().or(z.literal('')),
  selectedDate: z.date().optional(),
  startTime: z.string().min(1, 'La hora de inicio es requerida.'),
  endTime: z.string().min(1, 'La hora de fin es requerida.'),
  appointmentType: z.enum(['nueva', 'mantenimiento']).optional(),
}).refine(data => {
    if (data.clientId === 'new' && !data.newClientName) {
        return false;
    }
    return true;
}, {
    message: 'El nombre es requerido para un nuevo cliente.',
    path: ['newClientName'],
}).refine(data => {
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
    message: 'La hora de fin debe ser posterior a la hora de inicio.',
    path: ['endTime'],
});

type EventDetailsFormData = z.infer<typeof eventDetailsSchema>;

interface EventDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event & { isImported?: boolean } | null;
  onEventUpdate: () => void;
}

const generateTimeOptions = () => {
  const options = [];
  const startTime = setMinutes(setHours(new Date(), 6), 0); // 6:00 AM
  const endTime = setMinutes(setHours(new Date(), 23), 0); // 11:00 PM
  let currentTime = startTime;

  while (currentTime <= endTime) {
    options.push(format(currentTime, 'HH:mm'));
    currentTime = addMinutes(currentTime, 10);
  }
  return options;
};

const colors = [
    { value: '#d50000', label: 'Tomate' },
    { value: '#e67c73', label: 'Salmón' },
    { value: '#ff7043', label: 'Naranja' },
    { value: '#fdd835', label: 'Amarillo' },
    { value: '#33b679', label: 'Verde' },
    { value: '#0b8043', label: 'Verde Oscuro' },
    { value: '#039be5', label: 'Azul Cielo' },
    { value: '#3f51b5', label: 'Índigo' },
    { value: '#7986cb', label: 'Lavanda' },
    { value: '#8e24aa', label: 'Púrpura' },
    { value: '#616161', label: 'Grafito' },
];

export function EventDetailsDialog({
  isOpen,
  onOpenChange,
  event,
  onEventUpdate,
}: EventDetailsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isCancelled = event?.status === 'cancelled';
  const reminderHasBeenSent = event?.reminderSent;
  const lateMinutes = event?.lateMinutes || 0;
  const timeOptions = useMemo(() => generateTimeOptions(), []);
  const isAdmin = user?.role === 'administrador';

  const form = useForm<EventDetailsFormData>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: {
      amountPaid: 0,
      sessionNumber: '',
      serviceIds: [],
      lateMinutes: 0,
      clientId: '',
      newClientName: '',
      newClientLastName: '',
      startTime: '',
      endTime: '',
      appointmentType: 'nueva',
    }
  });
  
  const clientIdValue = form.watch('clientId');
  const startTimeValue = form.watch('startTime');

  const endTimeOptions = useMemo(() => {
    if (!startTimeValue) {
        return timeOptions;
    }
    return timeOptions.filter(time => time >= startTimeValue);
  }, [startTimeValue, timeOptions]);
  
  const currentClient = useMemo(() => clients.find(c => c.id === event?.clientId), [clients, event]);
  
  const handleSaveChanges = async () => {
    const data = form.getValues();
    if (!event?.id || !user) {
        toast({
            title: "Error",
            description: "No se encontró el ID de la cita para actualizar.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmitting(true);
    
    const baseDate = new Date(data.selectedDate || event.startDate);
    const [startHours, startMinutes] = (data.startTime || format(event.startDate, "HH:mm")).split(':').map(Number);
    const newStartDate = setHours(setMinutes(baseDate, startMinutes), startHours);

    const timeChanged = newStartDate.getTime() !== event.startDate.getTime();
    
    try {
        if(timeChanged) {
             const [endHours, endMinutes] = (data.endTime || format(event.endDate, "HH:mm")).split(':').map(Number);
             const newEndDate = setHours(setMinutes(baseDate, endMinutes), endHours);
            
             await runTransaction(db, async (transaction) => {
                const originalEventRef = doc(db, 'events', event.id);
                const newEventRef = doc(collection(db, 'events'));

                const rescheduledText = `--- REAGENDADA por ${user.name} para ${format(newStartDate, "d MMM, HH:mm", { locale: es })}. Motivo: Actualización de horario. ---`;
                transaction.update(originalEventRef, {
                    status: 'cancelled',
                    description: `${event.description || ''}\n${rescheduledText}`.trim(),
                });

                const newEventData = {
                    ...event,
                    startDate: Timestamp.fromDate(newStartDate),
                    endDate: Timestamp.fromDate(newEndDate),
                    status: 'confirmed',
                    createdAt: Timestamp.now(),
                    isImported: false,
                    colorModified: true,
                    clientName_lowercase: (event.clientName || '').toLowerCase(),
                    appointmentType: data.appointmentType || event.appointmentType || 'nueva',
                };
                delete (newEventData as any).id;
                delete (newEventData as any).top;
                delete (newEventData as any).height;
                delete (newEventData as any).left;
                delete (newEventData as any).width;
                delete (newEventData as any).zIndex;
                transaction.set(newEventRef, newEventData);

                // Activity Logs
                const logRefNew = doc(collection(db, 'activity_log'));
                transaction.set(logRefNew, { userId: user.id, userName: user.name, action: `Creó una nueva cita para ${event.clientName} (reagendada).`, timestamp: Timestamp.now(), eventId: newEventRef.id, clientId: event.clientId });
                const logRefCancelled = doc(collection(db, 'activity_log'));
                transaction.set(logRefCancelled, { userId: user.id, userName: user.name, action: `Reagendó la cita de ${event.clientName}.`, timestamp: Timestamp.now(), eventId: event.id, clientId: event.clientId });
            });

        } else {
            await runTransaction(db, async (tx) => {
                let finalClientId = event.clientId || '';
                let finalClientName = event.clientName || '';
                let logAction = `Modificó la cita de "${finalClientName}".`;
                
                if (event.isImported && data.clientId) {
                    if(data.clientId === 'new') {
                        if (!data.newClientName) throw new Error("El nombre es requerido para un nuevo cliente.");
                        const newClientRef = doc(collection(db, "clients"));
                        const name = data.newClientName.toUpperCase();
                        const lastName = (data.newClientLastName || '').toUpperCase();
                        tx.set(newClientRef, { name, lastName, registrationDate: new Date() });
                        finalClientId = newClientRef.id;
                        finalClientName = `${name} ${lastName}`.trim();
                        logAction = `Confirmó y modificó la cita importada para el nuevo cliente "${finalClientName}".`;
                    } else {
                        const client = clients.find(c => c.id === data.clientId);
                        if (!client) throw new Error("Cliente seleccionado no encontrado.");
                        finalClientId = client.id;
                        finalClientName = `${client.name} ${client.lastName}`;
                        logAction = `Confirmó y modificó la cita importada, asignándola al cliente "${finalClientName}".`;
                    }
                }

                const [endHours, endMinutes] = (data.endTime || format(event.endDate, "HH:mm")).split(':').map(Number);
                const endDate = setHours(setMinutes(baseDate, endMinutes), endHours);

                const selectedServicesData = services.filter((s) => (data.serviceIds || []).includes(s.id));
                
                const payloadRaw = {
                    clientName: finalClientName,
                    clientName_lowercase: finalClientName.toLowerCase(),
                    clientId: finalClientId,
                    endDate: Timestamp.fromDate(endDate),
                    color: data.color,
                    serviceIds: selectedServicesData.map((s) => s.id),
                    serviceNames: selectedServicesData.map((s) => s.name),
                    description: data.description ?? "",
                    isImported: false, 
                    colorModified: true, 
                    updatedAt: new Date(),
                    amountPaid: data.amountPaid || 0,
                    sessionNumber: data.sessionNumber || 0,
                    appointmentType: data.appointmentType,
                };

                const payload = removeUndefined(payloadRaw);

                const ref = doc(db, "events", event.id);
                tx.update(ref, payload as any);
                
                const activityLogRef = doc(collection(db, 'activity_log'));
                tx.set(activityLogRef, { userId: user.id, userName: user.name, action: logAction, timestamp: Timestamp.now(), eventId: event.id, clientId: finalClientId });
            });
        }

        toast({ title: "Guardado", description: "La cita fue actualizada." });
        onEventUpdate?.();
        onOpenChange(false);
    } catch (error: any) {
        console.error("Error al actualizar cita:", error);
        toast({
            title: "Error al Guardar",
            description: error.message || "No se pudo actualizar la cita.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
};

  useEffect(() => {
    if (isOpen && event) {
        form.reset({
            clientId: event.clientId || '',
            newClientName: '',
            newClientLastName: '',
            serviceIds: Array.isArray(event.serviceIds) ? event.serviceIds : [],
            description: event.description || '',
            color: event.color || '#039be5',
            amountPaid: event.amountPaid || '',
            sessionNumber: event.sessionNumber || '',
            lateMinutes: event.lateMinutes || 0,
            selectedDate: event.startDate,
            startTime: format(event.startDate, 'HH:mm'),
            endTime: format(event.endDate, 'HH:mm'),
            appointmentType: event.appointmentType || 'nueva',
        });
        if (currentClient) {
            setEmail(currentClient.email || '');
        } else {
            setEmail('');
        }
    }
  }, [isOpen, event, form, currentClient]);

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clientsData: Client[] = [];
      snapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(clientsData);
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const servicesData: Service[] = [];
      snapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service);
      });
      setServices(servicesData);
    });
    return () => {
      unsubClients();
      unsubServices();
    };
  }, []);
  
  const serviceIdsValue = form.watch('serviceIds');

  const selectedServices = useMemo(() => {
    return services.filter(service => (serviceIdsValue || []).includes(service.id));
  }, [services, serviceIdsValue]);

  const handleSendReminder = async () => {
    if (!email || !user || !event) {
      toast({
        title: 'Correo no válido',
        description: 'Por favor, introduce una dirección de correo electrónico.',
        variant: 'destructive',
      });
      return;
    }

    const subject = `Recordatorio de Cita - ${event.clientName}`;
    const formattedDate = format(event.startDate, "eeee d 'de' MMMM 'de' yyyy", { locale: es });
    const formattedTime = format(event.startDate, "HH:mm 'hrs'");
    const html = `
      <h1>Recordatorio de Cita</h1>
      <p>Hola ${event.clientName},</p>
      <p>Te recordamos que tienes una cita programada para el <strong>${formattedDate}</strong> a las <strong>${formattedTime}</strong>.</p>
      <p>Lugar: Sucursal ${event.branch}</p>
      <p>¡Te esperamos!</p>
    `;

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: email, subject, html }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido al enviar el correo.');
      }
      
      const eventDocRef = doc(db, "events", event.id);
      await updateDoc(eventDocRef, { reminderSent: true });

      await addDoc(collection(db, 'activity_log'), {
          userId: user.id,
          userName: user.name,
          action: `Envió un recordatorio por correo para la cita de ${event.clientName} a ${email}.`,
          timestamp: Timestamp.now(),
          eventId: event.id,
          clientId: event.clientId,
      });

      onEventUpdate(); 
      
      toast({
        title: 'Recordatorio Enviado',
        description: `Se ha enviado un correo de recordatorio a ${email}.`,
      });

    } catch (error: any) {
       toast({
        title: 'Error al enviar recordatorio',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
 const handleCancel = async () => {
    if (!user || !event) return;

    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, { status: 'cancelled' });

      await addDoc(collection(db, 'activity_log'), {
          userId: user.id,
          userName: user.name,
          action: `Canceló la cita del cliente ${event.clientName}.`,
          timestamp: Timestamp.now(),
          eventId: event.id,
          clientId: event.clientId,
      });

      toast({ title: 'Cita cancelada' });
      onEventUpdate();
      onOpenChange(false);

    } catch (error) {
        console.error("Error cancelling event:", error);
        toast({ title: 'Error', description: 'No se pudo cancelar la cita.', variant: 'destructive' });
    }
  }

  const handlePermanentDelete = async () => {
    if (!isAdmin || !user || !event) return;
    try {
        const eventRef = doc(db, 'events', event.id);
        await deleteDoc(eventRef);
        await addDoc(collection(db, 'activity_log'), {
            userId: user.id,
            userName: user.name,
            action: `Eliminó permanentemente la cita de "${event.clientName}" del ${format(event.startDate, "d MMM yyyy, HH:mm", { locale: es })}.`,
            timestamp: Timestamp.now(),
            clientId: event.clientId, // Keep track of which client it was
        });

        toast({ title: 'Cita Eliminada Permanentemente' });
        onEventUpdate();
        onOpenChange(false);
    } catch (error) {
        console.error("Error permanently deleting event:", error);
        toast({ title: 'Error', description: 'No se pudo eliminar la cita permanentemente.', variant: 'destructive' });
    }
  }


  if (!event) return null;

  return (
    <>
      <TooltipProvider>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>Detalles de la Cita - {event.branch}</DialogTitle>
                <div className="flex-row items-center justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3"/> 
                            <span>Creado por: {event.createdBy?.name || 'Sistema'}</span>
                        </div>
                        {event.createdAt && (
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3"/>
                            <span>Creada: {format(event.createdAt, "d MMM yyyy, HH:mm:ss", { locale: es })}</span>
                          </div>
                        )}
                        {event.clientId &&
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsActivityOpen(true)}>
                              <History className="w-4 h-4"/>
                            </Button>
                        }
                         {event.isImported && (
                           <Badge variant="outline" className="border-blue-500 text-blue-500">Cita Importada</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {isCancelled && <Badge variant="destructive" className="flex items-center gap-1"><Ban className="w-3 h-3"/> Cancelada</Badge>}
                      {lateMinutes > 0 && <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Llegó Tarde ({lateMinutes} min)</Badge>}
                    </div>
                </div>
            </DialogHeader>
            <div className="overflow-y-auto pr-2 -mr-4">
              <Form {...form}>
              <form id="event-details-form" onSubmit={form.handleSubmit(handleSaveChanges)} className={cn("space-y-4 pt-4")}>
                  
                <fieldset disabled={isCancelled} className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-bold uppercase text-muted-foreground">Tipo de Cita</FormLabel>
                  <FormField
                    control={form.control}
                    name="appointmentType"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex items-center gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nueva" id="detail-nueva" />
                              <FormLabel htmlFor="detail-nueva" className="font-bold text-xs uppercase cursor-pointer">Nueva</FormLabel>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="mantenimiento" id="detail-mantenimiento" />
                              <FormLabel htmlFor="detail-mantenimiento" className="font-bold text-xs uppercase cursor-pointer">Mantenimiento</FormLabel>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {event.isImported && !event.clientId ? (
                    <div className='space-y-2'>
                        <div className='p-3 bg-blue-50 border border-blue-200 rounded-md'>
                            <Label className='text-blue-800'>Cliente Importado (sin confirmar)</Label>
                            <p className='font-semibold text-blue-900 uppercase'>{event.clientName}</p>
                            <p className='text-xs text-blue-700'>Guarda los cambios para confirmar este cliente, o selecciona uno diferente abajo para reemplazarlo.</p>
                        </div>
                        <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Opcional: Reemplazar con cliente existente</FormLabel>
                                <ClientSearchCombobox 
                                    clients={clients}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                ) : (
                    <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Cliente</FormLabel>
                            <ClientSearchCombobox 
                                clients={clients}
                                value={field.value || ''}
                                onChange={field.onChange}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                )}


                {clientIdValue === 'new' && (
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-md col-span-2">
                        <FormField
                            control={form.control}
                            name="newClientName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nuevo Nombre</FormLabel>
                                <FormControl><Input placeholder="Nombre" {...field} className="uppercase" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newClientLastName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nuevo Apellido (Opcional)</FormLabel>
                                <FormControl><Input placeholder="Apellido" {...field} className="uppercase" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                )}

                  <div className="flex items-end gap-4 text-sm">
                      <FormField
                          control={form.control}
                          name="selectedDate"
                          render={({ field }) => (
                          <FormItem className="flex flex-col">
                              <FormLabel>Fecha</FormLabel>
                              <Popover>
                              <PopoverTrigger asChild>
                                  <FormControl>
                                  <Button
                                      variant={"outline"}
                                      className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                      {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                  </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  locale={es}
                                  />
                              </PopoverContent>
                              </Popover>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hora Inicio</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {timeOptions.map(time => <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hora Fin</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {endTimeOptions.map(time => <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                  <FormField
                      control={form.control}
                      name="serviceIds"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Servicios</FormLabel>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <FormControl>
                                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value?.length && "text-muted-foreground")}>
                                              <span className="truncate">
                                                  {selectedServices.length > 0 ? `${selectedServices.length} servicios seleccionados` : "Seleccionar servicios"}
                                              </span>
                                          </Button>
                                      </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                      <Command>
                                          <CommandInput placeholder="Buscar servicio..." />
                                          <CommandList>
                                              <CommandEmpty>No se encontraron servicios.</CommandEmpty>
                                              <CommandGroup>
                                                  {services.map(service => (
                                                      <CommandItem
                                                          key={service.id}
                                                          value={service.name}
                                                          onSelect={() => {
                                                              const currentIds = form.getValues('serviceIds') || [];
                                                              const newIds = currentIds.includes(service.id)
                                                                  ? currentIds.filter(id => id !== service.id)
                                                                  : [...currentIds, service.id];
                                                              form.setValue('serviceIds', newIds, { shouldDirty: true });
                                                          }}
                                                      >
                                                          <CheckCircle className={cn("mr-2 h-4 w-4", (field.value || []).includes(service.id) ? "opacity-100" : "opacity-0")} />
                                                          {service.name}
                                                      </CommandItem>
                                                  ))}
                                              </CommandGroup>
                                          </CommandList>
                                      </Command>
                                  </PopoverContent>
                              </Popover>
                              <div className="space-y-1 pt-1">
                                  {selectedServices.map(service => (
                                      <div key={service.id} className="flex items-center justify-between text-sm p-1 bg-muted rounded-md">
                                          <span>{service.name}</span>
                                          <button type="button" onClick={() => {
                                                  const currentIds = form.getValues('serviceIds') || [];
                                                  const newIds = currentIds.filter(id => id !== service.id);
                                                  form.setValue('serviceIds', newIds, { shouldDirty: true });
                                              }} className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                              <FormMessage />
                          </FormItem>
                      )}
                      />

                  {!isCancelled && (
                    <div className="space-y-2">
                        <FormLabel>Recordatorio por Correo</FormLabel>
                        {reminderHasBeenSent ? (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span>Recordatorio ya enviado.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="email" 
                                    placeholder="correo@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={reminderHasBeenSent}
                                />
                                <Button type="button" variant="outline" size="icon" onClick={handleSendReminder} disabled={!email || reminderHasBeenSent}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Observaciones</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Sin observaciones." 
                              {...field}
                              value={field.value || ''}
                             />
                          </FormControl>
                      </FormItem>
                    )}
                  />


                  <Controller
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                          <FormItem>
                              <div className="flex flex-wrap gap-2 pt-2">
                              {colors.map((color) => (
                                <Tooltip key={color.value}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(color.value)}
                                            className={`w-7 h-7 rounded-full border-2 transition-transform transform hover:scale-110 ${
                                                field.value === color.value ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: color.value }}
                                            aria-label={color.label}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{color.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                              ))}
                              </div>
                          </FormItem>
                      )}
                  />
                  </fieldset>
              </form>
              </Form>
            </div>
            <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-between gap-2">
                 <div className="flex gap-2 justify-end sm:justify-start w-full">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button type="button" variant="outline" disabled={isCancelled}>
                                <Ban className="mr-2 w-4 h-4" />
                                Cancelar Cita
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro de cancelar la cita?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción marcará la cita como cancelada y no se podrá revertir. No se eliminará permanentemente.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cerrar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleCancel}>Sí, cancelar cita</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {isAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="icon">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar Cita Permanentemente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción es irreversible. La cita se eliminará de la base de datos y no podrá recuperarse. Quedará un registro en la bitácora.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>No, mantener</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePermanentDelete}>Sí, eliminar permanentemente</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cerrar
                    </Button>
                     {!isCancelled && (
                         <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </DialogFooter>
        </DialogContent>
        </Dialog>
      </TooltipProvider>
        
        {currentClient && <ClientActivityDialog 
            isOpen={isActivityOpen}
            onOpenChange={setIsActivityOpen}
            client={currentClient}
        />}
    </>
  );
}
