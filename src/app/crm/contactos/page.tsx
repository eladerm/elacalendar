"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Filter, 
  Download,
  Calendar,
  Clock,
  MessageCircle,
  Tag,
  ArrowUpRight,
  User as UserIcon,
  MapPin,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CRMContact } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for New Contact
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', waId: '', email: '', tags: '' });
  
  // States for Contact Details (Ver Ficha)
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Cross-reference DB Data
  const [clinicPatients, setClinicPatients] = useState<any[]>([]);

  useEffect(() => {
    // 1. Listen to CRM Contacts
    const q = query(collection(db, 'crm_contacts'));
    const unsubscribeCRM = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as CRMContact));
      
      liveData.sort((a,b) => a.name.localeCompare(b.name));
      setContacts(liveData);
      setIsLoading(false);
      
      if (selectedContact) {
        const updatedSelected = liveData.find(c => c.id === selectedContact.id);
        if (updatedSelected) { setSelectedContact(updatedSelected); }
      }
    });

    // 2. Listen to Clinic Clients for Cross-Reference Metrics
    const qClients = query(collection(db, 'clients'));
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
        const clientsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setClinicPatients(clientsData);
    });

    return () => { unsubscribeCRM(); unsubscribeClients(); };
  }, [selectedContact]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, 'crm_contacts'), {
            name: newContact.name,
            waId: newContact.waId,
            email: newContact.email,
            tags: newContact.tags.split(',').map(t => t.trim()).filter(t=>t),
            status: 'Activo',
            lastInteraction: serverTimestamp()
        });
        setIsNewModalOpen(false);
        setNewContact({ name: '', waId: '', email: '', tags: '' });
    } catch(err) {
        console.error("Error creating contact", err);
    }
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) return;
    
    // Preparar info
    const csvData = filteredContacts.map(c => ({
        Nombre: c.name,
        Whatsapp: `+${c.waId}`,
        Email: c.email || 'N/A',
        Etiquetas: (c.tags || []).join(', '),
        ID: c.id
    }));

    const csvObj = Papa.unparse(csvData);
    const blob = new Blob([csvObj], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Elapiel_CRM_Contactos_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteContact = async (id: string) => {
      if (!confirm("¿Estás seguro de que deseas eliminar este contacto permanente? Esto no afectará las citas existentes.")) return;
      try {
          await deleteDoc(doc(db, 'crm_contacts', id));
          setIsSheetOpen(false);
      } catch (e) {
          console.error(e);
      }
  };

  const filteredContacts = contacts.filter(c => 
     c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     c.waId.includes(searchQuery) ||
     (c.tags && c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-500" />
              Directorio de Clientes
           </h1>
           <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
              {contacts.length} Contactos Registrados en el CRM
           </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="border-slate-700 text-slate-300 hover:text-white bg-[#1e293b]/50 h-11">
             <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Button onClick={() => setIsNewModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Nuevo Contacto
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="bg-[#1e293b]/40 border-slate-700/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
             <Input 
                placeholder="Buscar por nombre, teléfono o etiqueta (ej. VIP)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700/50 text-white font-bold placeholder:text-slate-500 rounded-xl focus-visible:ring-emerald-500 h-11"
             />
           </div>
           {/* Masfiltros es visual placeholder para futura extension */}
           <Button variant="outline" disabled className="border-slate-700 bg-slate-900/50 text-slate-500 h-11 w-full md:w-auto rounded-xl">
              <Filter className="w-4 h-4 mr-2" /> Más Filtros
           </Button>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="bg-[#1e293b]/40 border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/50">
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest pl-6">Cliente</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Etiquetas</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Últ. Interacción</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                        <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin mx-auto" />
                    </td>
                  </tr>
              ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                       <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                       <h3 className="text-xl font-black text-white italic uppercase">Base Vacía</h3>
                       <p className="text-slate-500 mt-2 font-bold text-sm">No se encontraron contactos en tu CRM.</p>
                    </td>
                  </tr>
              ) : filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-white italic shadow-inner">
                        {contact.name[0]}
                      </div>
                      <div>
                        <div className="font-black text-white">{contact.name}</div>
                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                           Activo
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-500" /> +{contact.waId}
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="w-3.5 h-3.5 text-slate-500" /> {contact.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(contact.tags || []).map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-emerald-500" /> {tag}
                        </span>
                      ))}
                      {(!contact.tags || contact.tags.length === 0) && <span className="text-slate-600 text-xs italic">Sin etiquetas</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" /> Hoy
                      </span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <Button 
                        onClick={() => {
                            setSelectedContact(contact);
                            setIsSheetOpen(true);
                        }} 
                        variant="ghost" 
                        className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Ver Ficha <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PLANEL LATERAL "VER FICHA" COMPLETA DEL CONTACTO */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-[#0f172a] border-slate-700 text-white shadow-2xl p-0 w-full sm:max-w-md flex flex-col h-full overflow-hidden">
            {selectedContact && (
                <>
                <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20 shrink-0">
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-black uppercase italic text-emerald-400 flex justify-between items-center w-full">
                            <span>Perfil Extendido</span>
                        </SheetTitle>
                        <SheetDescription className="text-slate-400 font-bold">
                            Detalles registrados en la bóveda CRM del cliente.
                        </SheetDescription>
                    </SheetHeader>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Tarjeta Principal */}
                    <div className="flex items-center gap-4 bg-[#1e293b] p-4 rounded-2xl border border-slate-700">
                      <div className="w-16 h-16 rounded-full bg-slate-800 text-emerald-500 flex items-center justify-center font-black text-2xl italic shadow-inner">
                        {selectedContact.name[0]}
                      </div>
                      <div>
                        <div className="font-black text-xl text-white tracking-tight">{selectedContact.name}</div>
                        <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mt-1">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           Contacto Validado
                        </div>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                           <p className="text-xs font-black uppercase text-slate-400">Número de WhatsApp</p>
                           <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                              <Phone className="w-5 h-5 text-emerald-500" />
                              <span className="font-bold text-slate-200">+{selectedContact.waId}</span>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <p className="text-xs font-black uppercase text-slate-400">Correo Electrónico</p>
                           <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                              <Mail className="w-5 h-5 text-slate-500" />
                              <span className="font-bold text-slate-200">{selectedContact.email || "No registrado"}</span>
                           </div>
                        </div>
                    </div>

                    {/* Etiquetas */}
                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-emerald-500" /> Nivel de Etiquetado
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(selectedContact.tags || []).length > 0 ? (
                                selectedContact.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 uppercase tracking-wider">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-slate-500 text-sm font-bold italic bg-slate-900/50 p-3 w-full rounded-xl border border-slate-800 text-center">Sin etiquetas perfiladas</span>
                            )}
                        </div>
                    </div>

                    {/* Mapeo Clínico Cruzado */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Inteligencia Comercial
                        </p>
                        
                        {(() => {
                            // Intentamos cruzar datos (por telefono limpio o por nombre exacto)
                            const phoneStr = selectedContact.waId?.replace(/\D/g, '');
                            const matchedPatient = clinicPatients.find(p => 
                                (p.phone && p.phone.replace(/\D/g, '') === phoneStr) || 
                                (p.name && selectedContact.name && p.name.toLowerCase().includes(selectedContact.name.toLowerCase().split(' ')[0]))
                            );

                            if (matchedPatient) {
                                return (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Ingresado</span>
                                            <span className="text-xl font-black text-emerald-400">${(matchedPatient.totalPaid || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Sesiones Clínicas</span>
                                            <span className="text-xl font-black text-white">{matchedPatient.totalSessions || 0}</span>
                                        </div>
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center col-span-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Perfil Detectado en Base de Datos</span>
                                            <span className="text-sm font-bold text-slate-200 uppercase">{matchedPatient.name} {matchedPatient.lastName}</span>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                                        <Users className="w-6 h-6 text-slate-600" />
                                        <span className="text-xs font-bold text-slate-400">Lead en Etapa de Prospección</span>
                                        <span className="text-[10px] text-slate-500 max-w-[250px]">Aún no existen registros financieros ni cruces vinculados a este contacto dentro de la clínica.</span>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 shrink-0 bg-slate-900/30 gap-3 grid grid-cols-2">
                    <Button 
                      onClick={() => router.push(`/crm/chat`)} 
                      className="bg-emerald-500 col-span-2 hover:bg-emerald-600 text-white font-black uppercase h-12 rounded-xl shadow-lg shadow-emerald-500/20"
                    >
                        <MessageCircle className="w-5 h-5 mr-2" /> Chat Inmediato
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => alert("Función para editar datos. Esta función debe abrir un modal similar al de Nuevo Contacto para poder actualizar en DB.")}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold h-11"
                    >
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Perfil
                    </Button>
                    <Button 
                      onClick={() => handleDeleteContact(selectedContact.id)} 
                      variant="ghost" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 font-bold h-11"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Remover
                    </Button>
                </div>
                </>
            )}
        </SheetContent>
      </Sheet>

      {/* MODAL CREAR CONTACTO */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0f172a] border-slate-700 text-white p-0 overflow-hidden">
          <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20">
             <DialogHeader>
               <DialogTitle className="text-xl font-black italic uppercase text-emerald-400">Nuevo Lead</DialogTitle>
             </DialogHeader>
          </div>
          <form onSubmit={handleCreateContact} className="p-6 space-y-4">
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nombre Completo</label>
                 <Input required value={newContact.name} onChange={e=>setNewContact({...newContact, name: e.target.value})} className="bg-slate-900 border-slate-700 font-bold" placeholder="Ej. Juan Pérez" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">WhatsApp Oficial</label>
                 <Input required value={newContact.waId} onChange={e=>setNewContact({...newContact, waId: e.target.value})} className="bg-slate-900 border-slate-700 font-bold" placeholder="593985551234 (Sin +)" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Etiquetas (Separadas por coma)</label>
                 <Input value={newContact.tags} onChange={e=>setNewContact({...newContact, tags: e.target.value})} className="bg-slate-900 border-slate-700 font-bold" placeholder="VIP, Sucursal Norte, Mayorista" />
             </div>
             <div className="pt-4 flex justify-end gap-2">
                 <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
                 <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase">Guardar Lead</Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

