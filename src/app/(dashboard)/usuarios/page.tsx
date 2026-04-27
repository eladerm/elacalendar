
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { User as UserType } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { 
  User, 
  Trash2, 
  Pencil, 
  History, 
  Fingerprint, 
  Store, 
  Plus, 
  Search, 
  MoreHorizontal,
  UserCheck,
  UserX,
  RotateCcw,
  Camera,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const UserFormDialog = dynamic(() => import('@/components/user-form-dialog').then(mod => mod.UserFormDialog));
const UserActivityDialog = dynamic(() => import('@/components/user-activity-dialog').then(mod => mod.UserActivityDialog));
const UserResumeDialog = dynamic(() => import('@/components/user-resume-dialog').then(mod => mod.UserResumeDialog));

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<UserType | null>(null);
  const [selectedUserForResume, setSelectedUserForResume] = useState<UserType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [globalPhotoEnabled, setGlobalPhotoEnabled] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (querySnapshot) => {
      const usersData: UserType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({ ...data, id: doc.id } as UserType);
      });
      usersData.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(usersData);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'security'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalPhotoEnabled(docSnap.data().loginPhotoEnabled !== false);
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  const handleToggleGlobalPhoto = async (enabled: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'security'), {
        loginPhotoEnabled: enabled,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.name
      }, { merge: true });
      
      setGlobalPhotoEnabled(enabled);
      toast({
        title: enabled ? "Seguridad Activada" : "Seguridad Desactivada",
        description: enabled ? "Se capturará la foto de todos los usuarios al ingresar." : "Se ha deshabilitado el registro fotográfico global.",
      });
    } catch (e) {
      toast({ title: "Error al actualizar configuración", variant: "destructive" });
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      (u.name.toLowerCase().includes(q) || 
      u.employeeId.includes(q) || 
      u.email.toLowerCase().includes(q)) &&
      (activeTab === 'active' ? u.status !== 'inactive' : u.status === 'inactive')
    );
  }, [users, searchQuery, activeTab]);

  const stats = useMemo(() => {
    return {
        active: users.filter(u => u.status !== 'inactive').length,
        inactive: users.filter(u => u.status === 'inactive').length,
    };
  }, [users]);

  const handleAddNew = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };
  
  const handleViewLogs = (user: UserType) => {
    setSelectedUserForLogs(user);
    setIsActivityLogOpen(true);
  };

  const handleViewResume = (user: UserType) => {
    setSelectedUserForResume(user);
    setIsResumeOpen(true);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleDeactivate = async (id: string) => {
    try {
        const userDoc = doc(db, "users", id);
        const userToDeactivate = users.find(u => u.id === id);
        await updateDoc(userDoc, { status: 'inactive' });
        
        if (currentUser) {
            await addDoc(collection(db, 'activity_log'), {
                userId: currentUser.id,
                userName: currentUser.name,
                action: `DESACTIVÓ el acceso de ${userToDeactivate?.name}.`,
                timestamp: Timestamp.now()
            });
        }

        toast({ title: "Usuario Desactivado" });
    } catch (e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleReactivate = async (id: string) => {
    try {
        const userDoc = doc(db, "users", id);
        const userToReactivate = users.find(u => u.id === id);
        await updateDoc(userDoc, { status: 'active' });
        
        if (currentUser) {
            await addDoc(collection(db, 'activity_log'), {
                userId: currentUser.id,
                userName: currentUser.name,
                action: `REACTIVÓ el acceso de ${userToReactivate?.name}.`,
                timestamp: Timestamp.now()
            });
        }

        toast({ title: "Usuario Reactivado" });
    } catch (e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSaveUser = async (data: any) => {
    const uppercaseName = data.name.toUpperCase();
    const usersRef = collection(db, 'users');

    try {
        const qId = query(usersRef, where('employeeId', '==', data.employeeId));
        const idSnapshot = await getDocs(qId);
        if (idSnapshot.docs.some(d => editingUser ? d.id !== editingUser.id : true)) {
            toast({ title: "Error", description: "No. de Trabajador duplicado", variant: "destructive" });
            return;
        }

        const payload: any = {
            name: uppercaseName,
            email: data.email,
            employeeId: data.employeeId,
            username: data.employeeId,
            role: data.role,
            branch: data.branch,
            permissions: data.permissions,
            updatedAt: Timestamp.now()
        };

        if (data.password && data.password.trim() !== "") {
            payload.password = data.password;
        }

        if (editingUser) {
          await updateDoc(doc(db, 'users', editingUser.id), payload);
          toast({ title: "Usuario Actualizado" });
        } else {
          if (!payload.password) payload.password = "12345*";
          payload.status = 'active';
          payload.createdAt = Timestamp.now();
          await addDoc(collection(db, 'users'), payload);
          toast({ title: "Usuario Creado" });
        }
        setIsFormOpen(false);
        setEditingUser(null);
    } catch (e) {
        toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const isAdmin = currentUser?.role === 'administrador';

  return (
    <div className="min-h-screen w-full bg-muted/5">
      
      <main className="container py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-primary">Gestión de Personal</h1>
            <p className="text-muted-foreground font-medium">Control de accesos y perfiles de colaboradores.</p>
          </div>
          <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tight h-11 px-6 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Colaborador
          </Button>
        </div>

        {isAdmin && (
          <Card className="border-none shadow-sm ring-1 ring-primary/10 bg-white overflow-hidden">
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-black uppercase text-primary text-sm tracking-tight">Foto de Seguridad (Login)</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
                    {globalPhotoEnabled 
                      ? "ACTIVA: Se está capturando evidencia fotográfica de todos los usuarios al ingresar." 
                      : "INACTIVA: No se están registrando fotos de seguridad actualmente."
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="global-photo-toggle" className="text-[10px] font-black uppercase text-muted-foreground hidden sm:inline">Control Global</Label>
                <Switch id="global-photo-toggle" checked={globalPhotoEnabled} onCheckedChange={handleToggleGlobalPhoto} className="scale-125" />
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="active" onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <TabsList className="bg-white border p-1 rounded-xl h-12 w-full max-w-md">
              <TabsTrigger value="active" className="rounded-lg font-bold uppercase text-xs flex-1 gap-2">
                <UserCheck className="w-4 h-4" /> Activos <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.active}</Badge>
              </TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-lg font-bold uppercase text-xs flex-1 gap-2">
                <UserX className="w-4 h-4" /> Bajas <Badge variant="outline" className="ml-1 h-5 px-1.5">{stats.inactive}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre, ID o correo..." 
                className="pl-10 h-11 bg-white border-primary/20 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="active" className="m-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white relative">
                  <div className={cn("h-1.5 w-full", u.branch === 'Matriz' ? "bg-pink-600" : "bg-primary")} />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/10">
                          <AvatarImage src={u.photoUrl || ''} className="object-cover" />
                          <AvatarFallback className="bg-secondary text-primary font-black uppercase text-xs">
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-black uppercase leading-none truncate max-w-[160px]">{u.name}</CardTitle>
                          <div className="mt-1.5 font-bold text-[10px] uppercase text-muted-foreground">{u.role.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewResume(u)}><User className="mr-2 h-4 w-4" /> Hoja de Vida</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(u)}><Pencil className="mr-2 h-4 w-4" /> Editar Perfil</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewLogs(u)}><History className="mr-2 h-4 w-4" /> Ver Actividad</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Desactivar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>¿Desactivar a {u.name}?</AlertDialogTitle><AlertDialogDescription>El usuario ya no podrá iniciar sesión.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeactivate(u.id)} className="bg-destructive">Desactivar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-muted-foreground uppercase">
                      <div className="flex items-center gap-1.5 truncate"><Fingerprint className="w-3.5 h-3.5 text-primary" /> ID: {u.employeeId}</div>
                      <div className="flex items-center gap-1.5 truncate"><Store className="w-3.5 h-3.5 text-primary" /> {u.branch || 'Sin Sede'}</div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase border-t pt-3 mt-1">
                        <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary" /> Clave: <span className="text-foreground font-black tracking-wider">{showPasswords[u.id] ? (u.password || "VACÍA") : '••••••••'}</span></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => togglePasswordVisibility(u.id)}>{showPasswords[u.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inactive" className="m-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="group overflow-hidden border-none shadow-sm bg-white/60 grayscale opacity-80 relative">
                  <div className="h-1.5 w-full bg-slate-400" />
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-slate-200">
                          <AvatarImage src={u.photoUrl || ''} className="object-cover" />
                          <AvatarFallback className="bg-slate-100 text-slate-400 font-black uppercase text-xs">{u.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-black uppercase text-slate-500">{u.name}</CardTitle>
                          <Badge variant="outline" className="mt-1.5 font-black text-[10px] text-slate-400 uppercase">DESACTIVADO</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-green-600 font-black text-[10px] uppercase" onClick={() => handleReactivate(u.id)}><RotateCcw className="mr-1 h-3 w-3" /> Reactivar</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Suspense fallback={null}>
        {isFormOpen && (
            <UserFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleSaveUser} initialData={editingUser} />
        )}
        {isActivityLogOpen && selectedUserForLogs && (
            <UserActivityDialog isOpen={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} user={selectedUserForLogs} />
        )}
        {isResumeOpen && selectedUserForResume && (
            <UserResumeDialog isOpen={isResumeOpen} onOpenChange={setIsResumeOpen} user={selectedUserForResume} />
        )}
      </Suspense>
    </div>
  );
}
