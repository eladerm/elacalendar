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
  // States for New/Edit Contact
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contactForm, setContactForm] = useState({ id: '', name: '', waId: '', email: '', tags: '' });
  
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

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const tagsArray = contactForm.tags.split(',').map(t => t.trim()).filter(t=>t);
        
        if (isEditing && contactForm.id) {
            await updateDoc(doc(db, 'crm_contacts', contactForm.id), {
                name: contactForm.name,
                waId: contactForm.waId,
                email: contactForm.email,
                tags: tagsArray,
                lastInteraction: serverTimestamp()
            });
            // Update selected contact if sheet is open
            if (selectedContact?.id === contactForm.id) {
                setSelectedContact(prev => prev ? {...prev, name: contactForm.name, waId: contactForm.waId, email: contactForm.email, tags: tagsArray} : null);
            }
        } else {
            await addDoc(collection(db, 'crm_contacts'), {
                name: contactForm.name,
                waId: contactForm.waId,
                email: contactForm.email,
                tags: tagsArray,
                status: 'Activo',
                lastInteraction: serverTimestamp()
            });
            
            // 🚀 Entrenar AnythingLLM con el nuevo paciente solo al crear
            try {
                const content = `Nuevo paciente registrado en el sistema.\nNombre: ${contactForm.name}\nWhatsApp: +${contactForm.waId}\nEmail: ${contactForm.email || 'N/A'}\nEtiquetas: ${contactForm.tags || 'Ninguna'}\nFecha de registro: ${new Date().toLocaleString('es-EC')}`;
                await fetch('/api/anythingllm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'add_document',
                        title: `Paciente: ${contactForm.name}`,
                        content: content
                    })
                });
            } catch (llmError) {
                console.error("Error al enviar paciente a AnythingLLM:", llmError);
            }
        }

        setIsModalOpen(false);
        setContactForm({ id: '', name: '', waId: '', email: '', tags: '' });
        setIsEditing(false);
    } catch(err) {
        console.error("Error saving contact", err);
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
           <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Directorio de Clientes
           </h1>
           <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1">
              {contacts.length} Contactos Registrados en el CRM
           </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="border-border text-muted-foreground hover:text-foreground bg-accent/50 h-11">
             <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Button onClick={() => { setIsEditing(false); setContactForm({ id: '', name: '', waId: '', email: '', tags: '' }); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Nuevo Contacto
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
             <Input 
                placeholder="Buscar por nombre, teléfono o etiqueta (ej. VIP)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border text-foreground font-bold placeholder:text-muted-foreground rounded-xl focus-visible:ring-primary h-11"
             />
           </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-widest pl-6">Cliente</th>
                <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Contacto</th>
                <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Etiquetas</th>
                <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Últ. Interacción</th>
                <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                        <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin mx-auto" />
                    </td>
                  </tr>
              ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                       <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                       <h3 className="text-xl font-black text-foreground italic uppercase">Base Vacía</h3>
                       <p className="text-muted-foreground mt-2 font-bold text-sm">No se encontraron contactos en tu CRM.</p>
                    </td>
                  </tr>
              ) : filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-accent transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center font-black text-[#25D366] italic shadow-inner">
                        {contact.name[0]}
                      </div>
                      <div>
                        <div className="font-black text-foreground">{contact.name}</div>
                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1 mt-0.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                           Activo
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" /> +{contact.waId}
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {contact.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(contact.tags || []).map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary" /> {tag}
                        </span>
                      ))}
                      {(!contact.tags || contact.tags.length === 0) && <span className="text-muted-foreground text-xs italic">Sin etiquetas</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Hoy
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
                        className="text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10 font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity"
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
        <SheetContent className="bg-background border-border text-foreground shadow-2xl p-0 w-full sm:max-w-md flex flex-col h-full overflow-hidden">
            {selectedContact && (
                <>
                <div className="bg-primary/10 p-6 border-b border-primary/20 shrink-0">
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-black uppercase italic text-primary flex justify-between items-center w-full">
                            <span>Perfil Extendido</span>
                        </SheetTitle>
                        <SheetDescription className="text-muted-foreground font-bold">
                            Detalles registrados en la bóveda CRM del cliente.
                        </SheetDescription>
                    </SheetHeader>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Tarjeta Principal */}
                    <div className="flex items-center gap-4 bg-muted p-4 rounded-2xl border border-border">
                      <div className="w-16 h-16 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center font-black text-2xl italic shadow-inner">
                        {selectedContact.name[0]}
                      </div>
                      <div>
                        <div className="font-black text-xl text-foreground tracking-tight">{selectedContact.name}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1 mt-1">
                           <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                           Contacto Validado
                        </div>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                           <p className="text-xs font-black uppercase text-muted-foreground">Número de WhatsApp</p>
                           <div className="flex items-center gap-3 bg-background p-3 rounded-xl border border-border">
                              <Phone className="w-5 h-5 text-primary" />
                              <span className="font-bold text-foreground">+{selectedContact.waId}</span>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <p className="text-xs font-black uppercase text-muted-foreground">Correo Electrónico</p>
                           <div className="flex items-center gap-3 bg-background p-3 rounded-xl border border-border">
                              <Mail className="w-5 h-5 text-muted-foreground" />
                              <span className="font-bold text-foreground">{selectedContact.email || "No registrado"}</span>
                           </div>
                        </div>
                    </div>

                    {/* Etiquetas */}
                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" /> Nivel de Etiquetado
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(selectedContact.tags || []).length > 0 ? (
                                selectedContact.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-wider">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-muted-foreground text-sm font-bold italic bg-background p-3 w-full rounded-xl border border-border text-center">Sin etiquetas perfiladas</span>
                            )}
                        </div>
                    </div>

                    {/* Mapeo Clínico Cruzado */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <p className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
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
                                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Ingresado</span>
                                            <span className="text-xl font-black text-primary">${(matchedPatient.totalPaid || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Sesiones Clínicas</span>
                                            <span className="text-xl font-black text-foreground">{matchedPatient.totalSessions || 0}</span>
                                        </div>
                                        <div className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center col-span-2">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Perfil Detectado en Base de Datos</span>
                                            <span className="text-sm font-bold text-foreground uppercase">{matchedPatient.name} {matchedPatient.lastName}</span>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="bg-muted border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                                        <Users className="w-6 h-6 text-muted-foreground" />
                                        <span className="text-xs font-bold text-muted-foreground">Lead en Etapa de Prospección</span>
                                        <span className="text-[10px] text-muted-foreground max-w-[250px]">Aún no existen registros financieros ni cruces vinculados a este contacto dentro de la clínica.</span>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>

                <div className="p-6 border-t border-border shrink-0 bg-accent gap-3 grid grid-cols-2">
                    <Button 
                      onClick={() => router.push(`/crm/chat`)} 
                      className="col-span-2 h-12 rounded-xl font-black uppercase shadow-lg text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow: '0 4px 20px rgba(37,211,102,0.35)' }}
                    >
                        <MessageCircle className="w-5 h-5" /> Chat en WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => { 
                         setIsEditing(true); 
                         setContactForm({ 
                           id: selectedContact.id, 
                           name: selectedContact.name, 
                           waId: selectedContact.waId, 
                           email: selectedContact.email || '', 
                           tags: (selectedContact.tags || []).join(', ') 
                         }); 
                         setIsModalOpen(true); 
                      }}
                      className="border-border bg-background hover:bg-muted text-foreground font-bold h-11"
                    >
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Perfil
                    </Button>
                    <Button 
                      onClick={() => handleDeleteContact(selectedContact.id)} 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold h-11"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Remover
                    </Button>
                </div>
                </>
            )}
        </SheetContent>
      </Sheet>

      {/* MODAL CREAR/EDITAR CONTACTO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border text-foreground p-0 overflow-hidden">
          <div className="bg-primary/10 p-6 border-b border-primary/20">
             <DialogHeader>
               <DialogTitle className="text-xl font-black italic uppercase text-primary">
                 {isEditing ? 'Editar Contacto' : 'Nuevo Lead'}
               </DialogTitle>
             </DialogHeader>
          </div>
          <form onSubmit={handleSaveContact} className="p-6 space-y-4">
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre Completo</label>
                 <Input required value={contactForm.name} onChange={e=>setContactForm({...contactForm, name: e.target.value})} className="bg-background border-border font-bold text-foreground" placeholder="Ej. Juan Pérez" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">WhatsApp Oficial</label>
                 <Input required value={contactForm.waId} onChange={e=>setContactForm({...contactForm, waId: e.target.value})} className="bg-background border-border font-bold text-foreground" placeholder="593985551234 (Sin +)" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Correo Electrónico</label>
                 <Input type="email" value={contactForm.email} onChange={e=>setContactForm({...contactForm, email: e.target.value})} className="bg-background border-border font-bold text-foreground" placeholder="opcional@email.com" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Etiquetas (Separadas por coma)</label>
                 <Input value={contactForm.tags} onChange={e=>setContactForm({...contactForm, tags: e.target.value})} className="bg-background border-border font-bold text-foreground" placeholder="VIP, Sucursal Norte, Mayorista" />
             </div>
             <div className="pt-4 flex justify-end gap-2">
                 <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                 <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase">
                   {isEditing ? 'Guardar Cambios' : 'Guardar Lead'}
                 </Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

