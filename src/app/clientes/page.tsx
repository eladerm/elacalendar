
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { Client } from '@/lib/types';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { Mail, Trash2, Pencil, Search, Phone, Upload, MoreHorizontal, Users, CalendarIcon, X, AlertCircle, ShieldAlert, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, removeUndefined } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';

const ClientFormDialog = dynamic(() => import('@/components/client-form-dialog').then(mod => mod.ClientFormDialog));
const ClientImportDialog = dynamic(() => import('@/components/client-import-dialog').then(mod => mod.ClientImportDialog));

type ClientFormData = Omit<Client, 'id' | 'registrationDate' | 'totalPaid' | 'totalSessions' | 'totalLateArrivals' | 'totalMinutesLate'>;

export default function ClientesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataError, setDataError] = useState<string | null>(null);
  const [windowFocused, setWindowFocused] = useState(true);
  
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const isAdmin = user?.role === 'administrador';
  const canCreate = isAdmin || user?.permissions?.clientes?.crear;
  const canImport = isAdmin || user?.permissions?.clientes?.importar;
  const canEdit = isAdmin || user?.permissions?.clientes?.editar;
  const canDelete = isAdmin || user?.permissions?.clientes?.eliminar;

  // SEGURIDAD: Bloqueo de copia y clic derecho
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's')) || 
        (e.metaKey && (e.key === 'c' || e.key === 'u' || e.key === 's')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'I')
      ) {
        e.preventDefault();
        toast({ title: "Acción no permitida", description: "La copia de datos está restringida por seguridad.", variant: "destructive" });
      }
    };

    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [toast]);

  useEffect(() => {
    const clientsCollection = collection(db, 'clients');
    const unsubscribe = onSnapshot(clientsCollection,
    (querySnapshot) => {
      setDataError(null);
      const clientsData: Client[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status !== 'inactive') {
            clientsData.push({
                ...data,
                id: docSnap.id,
                birthDate: data.birthDate?.toDate ? data.birthDate.toDate() : data.birthDate ? new Date(data.birthDate) : undefined,
                registrationDate: data.registrationDate?.toDate ? data.registrationDate.toDate() : data.registrationDate ? new Date(data.registrationDate) : undefined,
            } as Client);
        }
      });
      clientsData.sort((a, b) => `${a.name} ${a.lastName}`.toLowerCase().localeCompare(`${b.name} ${b.lastName}`.toLowerCase()));
      setClients(clientsData);
    },
    (error) => {
      setDataError("No se pudieron cargar los clientes.");
    });
    return () => unsubscribe();
  }, []);

  const filteredClients = useMemo(() => {
    let result = clients;
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    
    if (lowercasedQuery) {
      result = result.filter((client) => {
        const fullName = `${client.name} ${client.lastName}`.toLowerCase();
        const contact = `${client.email || ''} ${client.phone || ''}`.toLowerCase();
        const idNum = (client.idNumber || '').toLowerCase();
        return fullName.includes(lowercasedQuery) || idNum.includes(lowercasedQuery) || contact.includes(lowercasedQuery);
      });
    }
    
    if (branchFilter !== 'all') result = result.filter(client => client.branch === branchFilter);
    if (dateRange?.from) {
      const start = startOfDay(dateRange.from);
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      result = result.filter(client => client.registrationDate && client.registrationDate >= start && client.registrationDate <= end);
    }
    return result;
  }, [clients, searchQuery, branchFilter, dateRange]);

  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, "clients", id), { status: 'inactive' });
    toast({ title: 'Cliente desactivado' });
  };

  const handleSaveClient = async (data: ClientFormData) => {
    const cleanedData = removeUndefined(data);
    if (editingClient) {
      await updateDoc(doc(db, 'clients', editingClient.id), cleanedData as any);
    } else {
      await addDoc(collection(db, 'clients'), { ...cleanedData, registrationDate: new Date() });
    }
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleImportClients = async (importedClients: Omit<Client, 'id'>[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    importedClients.forEach((clientData) => {
      const docRef = doc(collection(db, 'clients'));
      batch.set(docRef, removeUndefined(clientData));
    });
    await batch.commit();
    await addDoc(collection(db, 'activity_log'), { userId: user.id, userName: user.name, action: `Importó masivamente ${importedClients.length} clientes.`, timestamp: Timestamp.now() });
    toast({ title: 'Importación Exitosa' });
    setIsImportOpen(false);
  };

  return (
    <div className={cn("min-h-screen w-full transition-all duration-500", !windowFocused && "blur-md scale-[0.99] grayscale")}>
      <style jsx global>{`
        @media print {
          body { display: none !important; }
        }
        .no-select {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
      
      <SiteHeader />
      <main className="container py-8">
        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-col gap-6 bg-muted/10 rounded-t-xl border-b">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-lg text-white">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black uppercase tracking-tight">Directorio de Clientes</CardTitle>
                        <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="font-bold text-[10px] uppercase">Registrados: {clients.length}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canImport && (
                        <Button variant="outline" onClick={() => setIsImportOpen(true)} className="font-bold uppercase text-xs h-9"><Upload className="mr-2 h-4 w-4" /> Importar</Button>
                    )}
                    {canCreate && (
                        <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }} className="font-black uppercase text-xs h-9 shadow-md">Nuevo Cliente</Button>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-white rounded-2xl border shadow-sm">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Buscador Inteligente</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-primary" />
                        <Input 
                            placeholder="Nombre, cédula o contacto..." 
                            className="pl-10 h-10 border-primary/20 bg-muted/5 focus:ring-primary font-medium" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Sede de Origen</label>
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                        <SelectTrigger className="h-10 border-primary/20 bg-muted/5 font-bold"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-bold uppercase">Todas las sedes</SelectItem>
                            <SelectItem value="ELAPIEL MATRIZ" className="font-bold uppercase">Matriz</SelectItem>
                            <SelectItem value="ELAPIEL SAN RAFAEL" className="font-bold uppercase">San Rafael</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Periodo de Ingreso</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-bold border-primary/20 bg-muted/5", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}` : format(dateRange.from, "dd/MM/yy")) : <span className="text-[11px] uppercase">Rango de fechas</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent>
                    </Popover>
                </div>
                <div className="flex items-end">
                    <Button variant="ghost" onClick={() => { setSearchQuery(''); setBranchFilter('all'); setDateRange(undefined); }} className="h-10 w-full text-muted-foreground font-black uppercase text-[10px] hover:bg-muted/50">
                        <X className="mr-2 h-4 w-4" /> Limpiar Filtros
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {dataError && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error de Conexión</AlertTitle><AlertDescription>{dataError}</AlertDescription></Alert>}
            
            {searchQuery.trim().length < 3 ? (
                <div className="py-24 text-center space-y-4 bg-muted/5 rounded-3xl border border-dashed">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <div className="max-w-xs mx-auto">
                        <p className="text-xs text-muted-foreground/60 mt-1 font-medium italic">Realice una búsqueda (mínimo 3 caracteres) para visualizar la información de los clientes.</p>
                    </div>
                </div>
            ) : filteredClients.length > 0 ? (
                <div className="rounded-2xl border shadow-sm overflow-hidden no-select">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12 text-center font-black uppercase text-[10px]">#</TableHead>
                                <TableHead className="font-black uppercase text-[10px]">Nombre Completo</TableHead>
                                <TableHead className="font-black uppercase text-[10px]">Documento</TableHead>
                                <TableHead className="font-black uppercase text-[10px]">Información de Contacto</TableHead>
                                <TableHead className="font-black uppercase text-[10px]">Sede Principal</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client, index) => (
                                <TableRow key={client.id} className="hover:bg-primary/5 transition-colors border-b last:border-0 group">
                                    <TableCell className="text-center text-[10px] font-bold text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-black uppercase text-xs text-primary group-hover:translate-x-1 transition-transform">{client.name} {client.lastName}</TableCell>
                                    <TableCell className="font-mono text-xs">{client.idNumber || '---'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            {client.email && <span className="text-[10px] font-bold flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" /> {client.email}</span>}
                                            {client.phone && <span className="text-[10px] font-black flex items-center gap-1.5"><Phone className="w-3 h-3 text-primary" /> {client.phone}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-primary/10 text-primary border-none">{client.branch || 'NO ASIG.'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                    {(canEdit || canDelete) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0 group-hover:bg-primary/10"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                {canEdit && (
                                                    <DropdownMenuItem onClick={() => { setEditingClient(client); setIsFormOpen(true); }} className="font-bold uppercase text-[10px]"><Pencil className="mr-2 h-4 w-4" /> Editar Ficha</DropdownMenuItem>
                                                )}
                                                {canDelete && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive font-bold uppercase text-[10px]"><Trash2 className="mr-2 h-4 w-4" /> Desactivar Acceso</DropdownMenuItem></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle className="uppercase font-black text-destructive">¿Desactivar Cliente?</AlertDialogTitle><AlertDialogDescription className="font-bold">Esta acción ocultará a {client.name} del directorio activo. Solo un administrador general podrá reactivarlo.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel className="font-bold uppercase text-xs">Mantener activo</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(client.id)} className="bg-destructive text-white font-black uppercase text-xs">Confirmar Baja</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="py-24 text-center space-y-4 bg-muted/5 rounded-3xl border border-dashed">
                    <EyeOff className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <div className="max-w-xs mx-auto">
                        <p className="text-muted-foreground font-black uppercase text-sm tracking-tight">Sin resultados</p>
                        <p className="text-xs text-muted-foreground/60 mt-1 font-medium">No se encontraron clientes que coincidan con los criterios ingresados.</p>
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/5 p-4 rounded-b-xl border-t">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <ShieldAlert className="w-3 h-3 text-primary" />
                Protección de datos activa: Copia y selección restringidas.
            </div>
          </CardFooter>
        </Card>
      </main>
      <Suspense fallback={null}>
        {isFormOpen && <ClientFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleSaveClient} initialData={editingClient} />}
        {isImportOpen && <ClientImportDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} onImport={handleImportClients} />}
      </Suspense>
    </div>
  );
}
