
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { Service, User } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { Briefcase, Trash2, Pencil, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
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
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const ServiceFormDialog = dynamic(() => import('@/components/service-form-dialog').then(mod => mod.ServiceFormDialog));
const ServiceImportDialog = dynamic(() => import('@/components/service-import-dialog').then(mod => mod.ServiceImportDialog));

type ServiceFormData = Omit<Service, 'id'>;

export default function ConsumoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'services'), (querySnapshot) => {
      const servicesData: Service[] = [];
      querySnapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service);
      });
      // Sort services by code in ascending order
      servicesData.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      setServices(servicesData);
    });
    return () => unsubscribe();
  }, []);

  const handleAddNew = () => {
    setEditingService(null);
    setIsFormOpen(true);
  };
  
  const handleOpenImport = () => {
    setIsImportOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "services", id));
  };

  const handleSaveService = async (data: ServiceFormData) => {
    if (editingService) {
      const serviceDoc = doc(db, 'services', editingService.id);
      await updateDoc(serviceDoc, data);
    } else {
      await addDoc(collection(db, 'services'), data);
    }
    setIsFormOpen(false);
    setEditingService(null);
  };
  
  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setEditingService(null);
    }
    setIsFormOpen(open);
  }

  const handleExportXLSX = () => {
    const dataToExport = services.map(service => ({
      CODIGO: service.code,
      NOMBRE: service.name,
      TIPO: service.type,
      DURACION: service.duration,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");
    XLSX.writeFile(workbook, "servicios_exportados.xlsx");
     toast({
      title: 'Exportación Exitosa',
      description: `Se han exportado ${services.length} servicios a un archivo XLSX.`,
    });
  };

  const handleImportSubmit = async (importedServices: ServiceFormData[]) => {
    const servicesCollection = collection(db, 'services');
    const existingServicesSnapshot = await getDocs(servicesCollection);
    const existingCodes = new Set(existingServicesSnapshot.docs.map(doc => doc.data().code));
    
    const batch = writeBatch(db);
    const newServices = importedServices.filter(service => !existingCodes.has(service.code));

    if (newServices.length === 0) {
        toast({
            title: 'No hay servicios nuevos que importar',
            description: 'Todos los servicios en el archivo ya existen en la base de datos.',
            variant: 'destructive',
        });
        setIsImportOpen(false);
        return;
    }

    newServices.forEach((serviceData) => {
      const docRef = doc(servicesCollection);
      batch.set(docRef, serviceData);
    });

    try {
      await batch.commit();
      toast({
        title: 'Importación Exitosa',
        description: `${newServices.length} nuevos servicios han sido agregados.`,
      });
      setIsImportOpen(false);
    } catch (error) {
       toast({
        title: 'Error en la importación',
        description: `Ocurrió un error al importar los servicios.`,
        variant: 'destructive',
      });
    }
  };

  const isAdmin = user?.role === 'administrador';

  return (
    <div className="min-h-screen w-full">
      
      <main className="container py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Catálogo de Servicios</CardTitle>
            <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Button variant="outline" onClick={handleOpenImport}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                    </Button>
                    <Button variant="outline" onClick={handleExportXLSX}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button onClick={handleAddNew}>Agregar Servicio</Button>
                  </>
                )}
            </div>
          </CardHeader>
          <CardContent>
            {services.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombre (Zona)</TableHead>
                            <TableHead>Tipo de Servicio</TableHead>
                            <TableHead className="text-right">Duración (min)</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.map((service) => (
                            <TableRow key={service.id}>
                                <TableCell className="font-medium">{service.code}</TableCell>
                                <TableCell>{service.name}</TableCell>
                                <TableCell>{service.type}</TableCell>
                                <TableCell className="text-right">{service.duration}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menú</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(service)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            {isAdmin && (
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(service.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground text-center py-10">
                No hay servicios registrados.
                </p>
            )}
          </CardContent>
        </Card>
      </main>

       <Suspense fallback={<div className="flex justify-center items-center h-full"><p>Cargando...</p></div>}>
            {isFormOpen && (
                <ServiceFormDialog
                    isOpen={isFormOpen}
                    onOpenChange={handleCloseDialog}
                    onSubmit={handleSaveService}
                    initialData={editingService}
                />
            )}
            {isImportOpen && (
                <ServiceImportDialog 
                    isOpen={isImportOpen}
                    onOpenChange={setIsImportOpen}
                    onImport={handleImportSubmit}
                />
            )}
      </Suspense>
    </div>
  );
}

    
    
    
