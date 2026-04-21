"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addMinutes, format, setHours, setMinutes, parse as parseDate } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  CalendarDays,
  CheckCircle,
  DollarSign,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import type { Client, Service, Event } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ClientSearchCombobox } from "./client-search-combobox";

/* ===================== SCHEMA ===================== */

const eventFormSchema = z.object({
  selectedDate: z.date(),
  startTime: z.string().min(1, 'La hora de inicio es requerida.'),
  endTime: z.string().min(1, 'La hora de fin es requerida.'),
  clientId: z.string().min(1, "Debes seleccionar un cliente o crear uno nuevo."),
  newClientName: z.string().optional(),
  newClientLastName: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  description: z.string().optional(),
  color: z.string().min(1, "El color es requerido."),
  amountPaid: z.coerce.number().optional(),
  sessionNumber: z.coerce.number().optional(),
  appointmentType: z.enum(['nueva', 'mantenimiento']).default('nueva'),
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

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onEventUpdate: () => void;
  branch: "Matriz" | "Valle";
}

/* ===================== HELPERS ===================== */

const generateTimeOptions = () => {
  const options: string[] = [];
  let current = setMinutes(setHours(new Date(), 6), 0);
  const end = setMinutes(setHours(new Date(), 23), 0);

  while (current <= end) {
    options.push(format(current, "HH:mm"));
    current = addMinutes(current, 10);
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

/* ===================== COMPONENT ===================== */

export function EventFormDialog({
  isOpen,
  onOpenChange,
  selectedDate,
  onEventUpdate,
  branch,
}: EventFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeOptions = useMemo(generateTimeOptions, []);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      selectedDate,
      startTime: "",
      endTime: "",
      clientId: "",
      serviceIds: [],
      description: "",
      color: colors[0].value,
      amountPaid: 0,
      sessionNumber: 0,
      appointmentType: 'nueva',
    },
  });

  const clientIdValue = form.watch("clientId");
  const serviceIdsValue = form.watch("serviceIds") || [];
  const startTimeValue = form.watch("startTime");
  
  const endTimeOptions = useMemo(() => {
    if (!startTimeValue) {
        return timeOptions;
    }
    return timeOptions.filter(time => time > startTimeValue);
  }, [startTimeValue, timeOptions]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        selectedDate,
        startTime: format(selectedDate, "HH:mm"),
        endTime: format(addMinutes(selectedDate, 30), "HH:mm"),
        clientId: "",
        newClientName: "",
        newClientLastName: "",
        serviceIds: [],
        description: "",
        color: colors[Math.floor(Math.random() * colors.length)].value,
        amountPaid: 0,
        sessionNumber: 0,
        appointmentType: 'nueva',
      });
    }
  }, [isOpen, selectedDate, form]);

  useEffect(() => {
    if (startTimeValue) {
        const startDate = parseDate(startTimeValue, 'HH:mm', new Date());
        const newEndDate = addMinutes(startDate, 30);
        form.setValue('endTime', format(newEndDate, 'HH:mm'));
    }
  }, [startTimeValue, form]);

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)).sort((a,b) => a.name.localeCompare(b.name))
      );
    });

    const unsubServices = onSnapshot(collection(db, "services"), (snap) => {
      setServices(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service))
      );
    });

    return () => {
      unsubClients();
      unsubServices();
    };
  }, []);

  const selectedServices = useMemo(
    () => services.filter((s) => serviceIdsValue.includes(s.id)),
    [services, serviceIdsValue]
  );
  
  const handleServiceToggle = (serviceId: string) => {
    const currentIds = form.getValues('serviceIds') || [];
    const newIds = currentIds.includes(serviceId)
      ? currentIds.filter(id => id !== serviceId)
      : [...currentIds, serviceId];
    form.setValue('serviceIds', newIds, { shouldDirty: true });
  };
  
  const onSubmit = async (data: EventFormData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await runTransaction(db, async (tx) => {
        let currentClientId = data.clientId;
        let clientName = "";

        if (data.clientId === 'new') {
          if (!data.newClientName) throw new Error("Client name is required.");
          const newClientRef = doc(collection(db, "clients"));
          const name = data.newClientName.toUpperCase();
          const lastName = (data.newClientLastName || '').toUpperCase();
          tx.set(newClientRef, {
            name,
            lastName,
            registrationDate: new Date(),
          });
          currentClientId = newClientRef.id;
          clientName = `${name} ${lastName}`.trim();
        } else {
          const client = clients.find(c => c.id === data.clientId);
          if (!client) throw new Error("Selected client not found.");
          clientName = `${client.name} ${client.lastName}`;
        }
        
        const [startHours, startMinutes] = data.startTime.split(':').map(Number);
        const startDate = setHours(setMinutes(data.selectedDate, startMinutes), startHours);

        const [endHours, endMinutes] = data.endTime.split(':').map(Number);
        const endDate = setHours(setMinutes(data.selectedDate, endMinutes), endHours);

        const servicesData = services.filter(s => (data.serviceIds || []).includes(s.id));

        const eventRef = doc(collection(db, "events"));

        tx.set(eventRef, {
          title: clientName,
          clientName: clientName,
          clientName_lowercase: clientName.toLowerCase(),
          clientId: currentClientId,
          startDate: Timestamp.fromDate(startDate),
          endDate: Timestamp.fromDate(endDate),
          description: data.description || "",
          color: data.color,
          branch,
          status: 'confirmed',
          createdBy: {
            uid: user.id,
            name: user.name,
            initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase()
          },
          createdAt: Timestamp.now(),
          amountPaid: data.amountPaid || 0,
          sessionNumber: data.sessionNumber || 0,
          reminderSent: false,
          serviceIds: data.serviceIds || [],
          serviceNames: servicesData.map(s => s.name),
          lateMinutes: 0,
          notifiedUsers: [],
          isImported: false,
          appointmentType: data.appointmentType,
        });

        // Log activity
        const activityLogRef = doc(collection(db, 'activity_log'));
        tx.set(activityLogRef, {
          userId: user.id,
          userName: user.name,
          action: `Creó una nueva cita (${data.appointmentType}) para ${clientName}.`,
          timestamp: Timestamp.now(),
          eventId: eventRef.id,
          clientId: currentClientId,
        });

      });

      // 🚀 Enviar a AnythingLLM
      try {
          let computedClientName = "";
          if (data.clientId === 'new') {
            const name = data.newClientName?.toUpperCase() || "";
            const lastName = (data.newClientLastName || '').toUpperCase();
            computedClientName = `${name} ${lastName}`.trim();
          } else {
            const client = clients.find(c => c.id === data.clientId);
            computedClientName = client ? `${client.name} ${client.lastName}` : "Desconocido";
          }

          const [startHours, startMinutes] = data.startTime.split(':').map(Number);
          const computedStartDate = setHours(setMinutes(data.selectedDate, startMinutes), startHours);
          const serviceNames = selectedServices.map(s => s.name).join(', ') || "Ninguno específico";
          
          const documentContent = `Nueva cita agendada.\nPaciente: ${computedClientName}\nTratamientos/Servicios: ${serviceNames}\nNotas Técnicas/Observaciones: ${data.description || "Sin observaciones."}\nFecha y hora: ${format(computedStartDate, "dd/MM/yyyy HH:mm")}`;
          
          fetch('/api/anythingllm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'add_document',
                  title: `Cita: ${computedClientName} - ${format(computedStartDate, "dd/MM")}`,
                  content: documentContent
              })
          }).catch(e => console.error("AnythingLLM Fetch Error:", e));
          
      } catch(e) {
          console.error("Error updating AnythingLLM with appointment: ", e);
      }

      toast({ title: "Cita creada correctamente" });
      onEventUpdate();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "No se pudo guardar la cita",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Agendar Cita en {branch}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 -mr-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                <CalendarDays className="h-4 w-4" />
                <span>{format(selectedDate, "eeee, d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nueva" id="nueva" />
                          <FormLabel htmlFor="nueva" className="font-bold text-xs uppercase cursor-pointer">Nueva</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mantenimiento" id="mantenimiento" />
                          <FormLabel htmlFor="mantenimiento" className="font-bold text-xs uppercase cursor-pointer">Mant.</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <ClientSearchCombobox 
                    clients={clients}
                    value={field.value}
                    onChange={field.onChange}
                  />
                   <FormMessage />
                </FormItem>
              )}
            />

            {clientIdValue === 'new' && (
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-md col-span-2">
                 <FormField
                    control={form.control}
                    name="newClientName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nuevo Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre" {...field} className="uppercase" />
                        </FormControl>
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
                        <FormControl>
                          <Input placeholder="Apellido" {...field} className="uppercase" />
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Hora Inicio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
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
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
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
                                     <span className="truncate">{selectedServices.length > 0 ? `${selectedServices.length} servicios seleccionados` : "Seleccionar servicios"}</span>
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
                                        onSelect={() => handleServiceToggle(service.id)}
                                    >
                                        <CheckCircle className={cn("mr-2 h-4 w-4", serviceIdsValue.includes(service.id) ? "opacity-100" : "opacity-0")} />
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
                            <Badge key={service.id} variant="secondary" className="mr-1">
                                {service.name}
                            </Badge>
                        ))}
                    </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej. El cliente prefiere..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Abono (Opcional)</FormLabel>
                        <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input type="number" placeholder="0.00" {...field} />
                            </FormControl>
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sessionNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel># de Sesión (Opcional)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Ej. 1" {...field} />
                        </FormControl>
                        </FormItem>
                    )}
                />
            </div>
            

            <Controller
              name="color"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Color de la Etiqueta</FormLabel>
                    <div className="flex flex-wrap gap-2 pt-2">
                    {colors.map((c) => (
                        <TooltipProvider key={c.value}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                    type="button"
                                    onClick={() => field.onChange(c.value)}
                                    className={cn('w-7 h-7 rounded-full border-2 transition-transform transform hover:scale-110', field.value === c.value ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent')}
                                    style={{ backgroundColor: c.value }}
                                    aria-label={c.label}
                                    />
                                </TooltipTrigger>
                                <TooltipContent><p>{c.label}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                    </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cita
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
