"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc, query, where, onSnapshot, Timestamp, getDocs, deleteDoc } from 'firebase/firestore';
import type { User, UserDocument, ActivityLog } from '@/lib/types';
import { Camera, FileText, Upload, Trash2, Download, History, User as UserIcon, FileBadge2, Receipt, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserResumeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function UserResumeDialog({ isOpen, onOpenChange, user }: UserResumeDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('datos');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(user.resume || {});
  
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [docCategory, setDocCategory] = useState<'certificate' | 'invoice' | 'other'>('certificate');

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Sync internal state when user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData(user.resume || {});
    }
  }, [isOpen, user]);

  // Fetch Documents
  useEffect(() => {
    if (!isOpen || !user) return;
    const q = query(collection(db, 'users', user.id, 'documents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: UserDocument[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        docs.push({
          ...data,
          id: d.id,
          uploadedAt: data.uploadedAt?.toDate() || new Date()
        } as UserDocument);
      });
      docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      setDocuments(docs);
    });
    return () => unsubscribe();
  }, [isOpen, user]);

  // Fetch Logs
  useEffect(() => {
    if (!isOpen || !user) return;
    setLoadingLogs(true);
    const q = query(collection(db, 'activity_log'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: ActivityLog[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        logsData.push({
          id: d.id,
          ...data,
          timestamp: data.timestamp.toDate()
        } as ActivityLog);
      });
      logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setLogs(logsData);
      setLoadingLogs(false);
    });
    return () => unsubscribe();
  }, [isOpen, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDatos = async () => {
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'users', user.id), {
        resume: formData,
        updatedAt: Timestamp.now()
      });
      toast({ title: 'Datos actualizados', description: 'La hoja de vida se ha guardado correctamente.' });
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Convert File to Base64 for simple storage
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'La foto debe ser menor a 2MB', variant: 'destructive' });
      return;
    }
    
    try {
      const base64 = await fileToBase64(file);
      await updateDoc(doc(db, 'users', user.id), {
        photoUrl: base64
      });
      toast({ title: 'Fotografía actualizada' });
    } catch (error) {
      toast({ title: 'Error al subir foto', variant: 'destructive' });
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Max 5MB limit for Base64 documents
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'El documento debe ser menor a 5MB', variant: 'destructive' });
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await fileToBase64(file);
      
      const newDoc = {
        userId: user.id,
        category: docCategory,
        title: file.name,
        url: base64,
        fileType: file.type,
        size: file.size,
        uploadedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'users', user.id, 'documents'), newDoc);
      toast({ title: 'Documento guardado exitosamente' });
    } catch (error) {
      toast({ title: 'Error al subir el documento', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.id, 'documents', docId));
      toast({ title: 'Documento eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const triggerUpload = (category: 'certificate' | 'invoice') => {
    setDocCategory(category);
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden flex flex-col md:flex-row bg-slate-50">
        
        {/* LEFT SIDEBAR: PROFILE SUMMARY */}
        <div className="w-full md:w-[320px] bg-white border-r p-6 flex flex-col items-center shadow-sm z-10 shrink-0">
          <div className="relative group mt-4">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl bg-muted/50">
              <AvatarImage src={user.photoUrl || ''} className="object-cover" />
              <AvatarFallback className="text-4xl text-primary/40 font-black">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <button 
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform ring-4 ring-white"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="text-center mt-6 w-full space-y-2">
            <h2 className="text-2xl font-black uppercase text-slate-800 leading-tight">{user.name}</h2>
            <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-wider text-primary bg-primary/5">
              {user.role.replace('_', ' ')}
            </Badge>
            <p className="text-sm font-medium text-muted-foreground pt-2">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">ID Empleada</span>
              {user.employeeId}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Sucursal</span>
              {user.branch || 'Sin Asignar'}
            </p>
          </div>
        </div>

        {/* RIGHT MAIN CONTENT: TABS */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-2xl font-black uppercase text-slate-800">Hoja de Vida</DialogTitle>
            <DialogDescription>
              Gestiona el expediente digital, documentos e historial de la colaboradora.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-6 pb-6">
            <TabsList className="bg-white border rounded-xl h-12 w-full shrink-0 shadow-sm p-1">
              <TabsTrigger value="datos" className="rounded-lg font-bold uppercase text-xs flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <UserIcon className="w-4 h-4" /> Perfil y Datos
              </TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-lg font-bold uppercase text-xs flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <FileText className="w-4 h-4" /> Documentos
              </TabsTrigger>
              <TabsTrigger value="historial" className="rounded-lg font-bold uppercase text-xs flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <History className="w-4 h-4" /> Historial
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 rounded-xl border bg-white shadow-sm overflow-y-auto">
              {/* TAB: DATOS PERSONALES */}
              <TabsContent value="datos" className="m-0 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Teléfono Móvil</Label>
                    <Input name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+593 999 999 999" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha de Nacimiento</Label>
                    <Input name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleChange} className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Dirección Domiciliaria</Label>
                    <Input name="address" value={formData.address || ''} onChange={handleChange} placeholder="Calle, Barrio, Sector..." className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Contacto de Emergencia</Label>
                    <Input name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} placeholder="Nombre del familiar" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Teléfono de Emergencia</Label>
                    <Input name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleChange} placeholder="Teléfono" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Sangre</Label>
                    <Input name="bloodType" value={formData.bloodType || ''} onChange={handleChange} placeholder="O+, A-, etc." className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha de Ingreso</Label>
                    <Input name="hireDate" type="date" value={formData.hireDate || ''} onChange={handleChange} className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Alergias o Condiciones Médicas</Label>
                    <Textarea name="allergies" value={formData.allergies || ''} onChange={handleChange} placeholder="Detallar si aplica..." className="resize-none" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Observaciones (RRHH)</Label>
                    <Textarea name="observations" value={formData.observations || ''} onChange={handleChange} placeholder="Notas internas sobre desempeño, historial, etc." className="h-24 resize-none" />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveDatos} disabled={isSaving} className="bg-primary hover:bg-primary/90 font-black uppercase tracking-tight px-8">
                    {isSaving ? 'Guardando...' : 'Guardar Datos'}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB: DOCUMENTOS */}
              <TabsContent value="documentos" className="m-0 p-6 space-y-8">
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleDocumentUpload} />
                
                {/* Certificates Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><FileBadge2 className="w-5 h-5" /></div>
                      <h3 className="font-black uppercase text-slate-800">Certificados y Títulos</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => triggerUpload('certificate')} disabled={isUploading} className="text-xs font-bold uppercase">
                      <Upload className="w-3.5 h-3.5 mr-2" /> Subir Certificado
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {documents.filter(d => d.category === 'certificate').length === 0 && (
                      <p className="text-sm text-muted-foreground italic py-2">No hay certificados registrados.</p>
                    )}
                    {documents.filter(d => d.category === 'certificate').map(doc => (
                      <Card key={doc.id} className="shadow-none border-dashed bg-slate-50/50">
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate text-slate-700">{doc.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{format(doc.uploadedAt, 'dd MMM yyyy', {locale: es})} • {(doc.size || 0) / 1024 < 1024 ? `${Math.round((doc.size || 0) / 1024)} KB` : `${Math.round((doc.size || 0) / 1024 / 1024 * 10) / 10} MB`}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <a href={doc.url} download={doc.title} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-primary transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Invoices Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Receipt className="w-5 h-5" /></div>
                      <h3 className="font-black uppercase text-slate-800">Facturas Mensuales</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => triggerUpload('invoice')} disabled={isUploading} className="text-xs font-bold uppercase">
                      <Upload className="w-3.5 h-3.5 mr-2" /> Subir Factura
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {documents.filter(d => d.category === 'invoice').length === 0 && (
                      <p className="text-sm text-muted-foreground italic py-2">No hay facturas registradas.</p>
                    )}
                    {documents.filter(d => d.category === 'invoice').map(doc => (
                      <Card key={doc.id} className="shadow-none border-dashed bg-slate-50/50">
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate text-slate-700">{doc.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{format(doc.uploadedAt, 'MMMM yyyy', {locale: es})} • Factura</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <a href={doc.url} download={doc.title} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-primary transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* TAB: HISTORIAL */}
              <TabsContent value="historial" className="m-0 p-6">
                {loadingLogs ? (
                  <div className="flex justify-center py-10"><p className="text-sm font-bold uppercase text-muted-foreground">Cargando bitácora...</p></div>
                ) : logs.length > 0 ? (
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-4">
                    {logs.map((log) => (
                      <div key={log.id} className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                        <div className="bg-slate-50 border rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
                          <p className="text-sm font-medium text-slate-700">{log.action}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 flex items-center gap-1.5">
                            <History className="w-3 h-3" />
                            {format(log.timestamp, "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase">Sin Actividad Reciente</p>
                    <p className="text-xs text-muted-foreground mt-1">Este usuario aún no tiene registros en la bitácora.</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

      </DialogContent>
    </Dialog>
  );
}
