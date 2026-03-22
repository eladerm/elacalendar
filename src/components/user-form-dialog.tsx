
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShieldCheck, User as UserIcon, Lock, MapPin, LayoutGrid, CheckCircle2, Calendar, Users, Package, Briefcase, FileText, BarChart2, WalletMinimal, Camera } from 'lucide-react';
import type { User, UserPermissions } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  employeeId: z.string().min(1, 'El No. de Trabajador es requerido.'),
  password: z.string().optional().or(z.literal('')),
  branch: z.enum(['Matriz', 'Valle']).optional(),
  role: z.enum(['administrador', 'administrador_sucursal', 'operaria'], {
    required_error: "El rol es requerido.",
  }),
  permissions: z.any(),
}).refine(data => {
    if (data.password && data.password.length > 0) {
        return data.password.length >= 4;
    }
    return true;
}, {
    message: 'La clave debe tener al menos 4 caracteres.',
    path: ['password'],
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => void;
  initialData?: User | null;
}

const defaultPermissions: UserPermissions = {
  calendario: { ver: true, crear: true, editar: true, cancelar: true, eliminar: false, importar: false, exportar: false },
  clientes: { ver: true, crear: true, editar: true, eliminar: false, importar: false, exportar: false },
  inventario: { ver: true, crear: false, editar: false, eliminar: false, abrir_terminar: true, estadisticas: false, configuracion: false, entregas_ver: true, entregas_crear: false },
  servicios: { ver: true, crear: false, editar: false, eliminar: false, importar: false, exportar: false },
  usuarios: { ver: false, crear: false, editar: false, desactivar: false, ver_actividad: false },
  bitacora: { ver: false, foto_login: true },
  reportes: { ver: false },
  finanzas: { ver: false, exportar: false },
};

const adminPermissions: UserPermissions = {
  calendario: { ver: true, crear: true, editar: true, cancelar: true, eliminar: true, importar: true, exportar: true },
  clientes: { ver: true, crear: true, editar: true, eliminar: true, importar: true, exportar: true },
  inventario: { ver: true, crear: true, editar: true, eliminar: true, abrir_terminar: true, estadisticas: true, configuracion: true, entregas_ver: true, entregas_crear: true },
  servicios: { ver: true, crear: true, editar: true, eliminar: true, importar: true, exportar: true },
  usuarios: { ver: true, crear: true, editar: true, desactivar: true, ver_actividad: true },
  bitacora: { ver: true, foto_login: true },
  reportes: { ver: true },
  finanzas: { ver: true, exportar: true },
};

const permissionSections = [
  { 
    id: 'calendario', 
    label: 'Calendario', 
    icon: Calendar,
    options: [
      { id: 'ver', label: 'Ver Calendario' },
      { id: 'crear', label: 'Crear Citas' },
      { id: 'editar', label: 'Editar Citas' },
      { id: 'cancelar', label: 'Cancelar Citas' },
      { id: 'eliminar', label: 'Eliminar Permanente' },
      { id: 'importar', label: 'Importar Citas' },
      { id: 'exportar', label: 'Exportar ICS' },
    ]
  },
  { 
    id: 'clientes', 
    label: 'Clientes', 
    icon: Users,
    options: [
      { id: 'ver', label: 'Ver Listado' },
      { id: 'crear', label: 'Agregar Cliente' },
      { id: 'editar', label: 'Editar Cliente' },
      { id: 'eliminar', label: 'Desactivar Cliente' },
      { id: 'importar', label: 'Importar Clientes' },
      { id: 'exportar', label: 'Exportar Clientes' },
    ]
  },
  { 
    id: 'inventario', 
    label: 'Inventario', 
    icon: Package,
    options: [
      { id: 'ver', label: 'Ver Bodega' },
      { id: 'crear', label: 'Nuevo Producto' },
      { id: 'editar', label: 'Editar Producto' },
      { id: 'eliminar', label: 'Eliminar Producto' },
      { id: 'abrir_terminar', label: 'Abrir/Terminar Unid.' },
      { id: 'estadisticas', label: 'Ver Estadísticas' },
      { id: 'configuracion', label: 'Configurar Categorías' },
      { id: 'entregas_ver', label: 'Ver Historial Entregas' },
      { id: 'entregas_crear', label: 'Registrar Entrega' },
    ]
  },
  { 
    id: 'finanzas', 
    label: 'Finanzas', 
    icon: WalletMinimal,
    options: [
      { id: 'ver', label: 'Ver Control Financiero' },
      { id: 'exportar', label: 'Exportar Reportes Financieros' },
    ]
  },
  { 
    id: 'servicios', 
    label: 'Servicios', 
    icon: Briefcase,
    options: [
      { id: 'ver', label: 'Ver Catálogo' },
      { id: 'crear', label: 'Agregar Servicio' },
      { id: 'editar', label: 'Editar Servicio' },
      { id: 'eliminar', label: 'Eliminar Servicio' },
      { id: 'importar', label: 'Importar Servicios' },
      { id: 'exportar', label: 'Exportar Servicios' },
    ]
  },
  { 
    id: 'usuarios', 
    label: 'Usuarios', 
    icon: UserIcon,
    options: [
      { id: 'ver', label: 'Ver Personal' },
      { id: 'crear', label: 'Registrar Usuario' },
      { id: 'editar', label: 'Editar Perfiles' },
      { id: 'desactivar', label: 'Desactivar Accesos' },
      { id: 'ver_actividad', label: 'Ver Historial Actividad' },
    ]
  },
  { 
    id: 'bitacora', 
    label: 'Bitácora', 
    icon: FileText,
    options: [
      { id: 'ver', label: 'Ver Bitácora de Auditoría' },
    ]
  },
  { 
    id: 'reportes', 
    label: 'Reportes', 
    icon: BarChart2,
    options: [
      { id: 'ver', label: 'Ver Reportes Operativos' },
    ]
  },
];

export function UserFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
}: UserFormDialogProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      employeeId: '',
      password: '',
      role: 'operaria',
      permissions: defaultPermissions,
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            form.reset({
                name: initialData.name,
                email: initialData.email,
                employeeId: initialData.employeeId,
                role: initialData.role,
                branch: initialData.branch,
                password: '',
                permissions: initialData.permissions || (initialData.role === 'administrador' ? adminPermissions : defaultPermissions),
            });
        } else {
            form.reset({
                name: '',
                email: '',
                employeeId: '',
                password: '',
                role: 'operaria',
                permissions: defaultPermissions,
            });
        }
    }
  }, [isOpen, initialData, form]);

  const handleRoleChange = (role: string) => {
    form.setValue('role', role as any);
    if (role === 'administrador') {
      form.setValue('permissions', adminPermissions);
    } else if (role === 'administrador_sucursal') {
      form.setValue('permissions', { ...defaultPermissions, bitacora: { ver: true, foto_login: true }, reportes: { ver: true }, finanzas: { ver: true } });
    } else {
      form.setValue('permissions', defaultPermissions);
    }
  };

  const handleToggleSection = (sectionId: string, checked: boolean) => {
    const section = permissionSections.find(s => s.id === sectionId);
    if (!section) return;
    
    const currentPermissions = { ...form.getValues('permissions') };
    const newSectionPerms = { ...currentPermissions[sectionId] };
    
    section.options.forEach(opt => {
      newSectionPerms[opt.id] = checked;
    });
    
    currentPermissions[sectionId] = newSectionPerms;
    form.setValue('permissions', currentPermissions);
  };

  const handleToggleAll = (checked: boolean) => {
    form.setValue('permissions', checked ? adminPermissions : Object.keys(defaultPermissions).reduce((acc, key) => {
        acc[key] = Object.keys((defaultPermissions as any)[key]).reduce((subAcc, subKey) => {
            (subAcc as any)[subKey] = false;
            return subAcc;
        }, {});
        return acc;
    }, {} as any));
  };

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  const currentRole = form.watch('role');

  const filteredSections = permissionSections.filter(section => {
    if (currentRole === 'operaria') {
      return !['usuarios', 'bitacora', 'reportes', 'finanzas'].includes(section.id);
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none bg-background">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3 text-primary">
            <div className="bg-primary/10 p-2 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              {initialData ? 'Gestionar Perfil' : 'Nuevo Colaborador'}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-0">
            <div className="p-6 pt-4 space-y-8">
                {/* Sección Información Personal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-muted/50">
                    <div className="col-span-full flex items-center gap-2 text-sm font-black uppercase text-muted-foreground mb-2">
                        <UserIcon className="w-4 h-4" /> Datos del Colaborador
                    </div>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem className="col-span-full">
                            <FormLabel className="text-xs uppercase font-bold">Nombre Completo</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej. ANA PAULA" {...field} className="uppercase font-bold h-11" />
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
                            <FormLabel className="text-xs uppercase font-bold">Correo Electrónico</FormLabel>
                            <FormControl>
                            <Input placeholder="nombre@example.com" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs uppercase font-bold">No. de Trabajador</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej. 1001" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs uppercase font-bold">Rol Principal</FormLabel>
                            <Select onValueChange={handleRoleChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar rol..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="administrador">Administrador General</SelectItem>
                                <SelectItem value="administrador_sucursal">Gerente de Sede</SelectItem>
                                <SelectItem value="operaria">Personal Operativo</SelectItem>
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
                            <FormLabel className="text-xs uppercase font-bold">Sede Asignada</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger className="h-11">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Seleccionar sucursal..." />
                                </div>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Matriz">ÉLAPIEL MATRIZ</SelectItem>
                                <SelectItem value="Valle">ÉLAPIEL VALLE</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem className="col-span-full">
                            <FormLabel className="text-xs uppercase font-bold">Contraseña de Acceso</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder={initialData ? "Dejar en blanco para mantener actual" : "Mínimo 4 caracteres"} {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                {/* Sección de Permisos Granulares */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 text-sm font-black uppercase text-primary">
                            <LayoutGrid className="w-5 h-5" /> Control de Accesos Detallado
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-primary" onClick={() => handleToggleAll(true)}>Activar Todo</Button>
                            <Button type="button" variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-destructive" onClick={() => handleToggleAll(false)}>Bloquear Todo</Button>
                        </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full space-y-3">
                        {filteredSections.map((section) => (
                            <AccordionItem key={section.id} value={section.id} className="border rounded-2xl px-4 bg-white shadow-sm overflow-hidden border-muted/60 data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-muted p-2 rounded-lg text-muted-foreground group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary">
                                            <section.icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-black uppercase text-xs tracking-wider">{section.label}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-6">
                                    <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                                        <div className="flex justify-end gap-2 mb-3">
                                            <button type="button" onClick={() => handleToggleSection(section.id, true)} className="text-[9px] font-bold uppercase text-primary hover:underline">Marcar todos</button>
                                            <span className="text-muted-foreground text-[9px]">|</span>
                                            <button type="button" onClick={() => handleToggleSection(section.id, false)} className="text-[9px] font-bold uppercase text-muted-foreground hover:underline">Desmarcar</button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 px-2">
                                            {section.options.map((opt) => (
                                                <FormField
                                                    key={opt.id}
                                                    control={form.control}
                                                    name={`permissions.${section.id}.${opt.id}`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between space-y-0">
                                                            <FormLabel className="text-[11px] font-bold uppercase text-muted-foreground cursor-pointer select-none">{opt.label}</FormLabel>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={!!field.value}
                                                                    onCheckedChange={field.onChange}
                                                                    className="scale-75 origin-right"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>

            <DialogFooter className="p-6 bg-muted/10 border-t gap-3 sm:gap-0 sticky bottom-0 rounded-b-2xl backdrop-blur-md">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-bold border-muted-foreground/20">
                Cancelar
              </Button>
              <Button type="submit" className="font-black uppercase tracking-tight px-10 shadow-lg shadow-primary/30">
                {initialData ? 'Guardar Cambios' : 'Registrar Colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
