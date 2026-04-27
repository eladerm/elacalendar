
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Delivery, User } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { 
  Truck, 
  Search, 
  Plus, 
  ArrowLeft,
  Calendar as CalendarIcon,
  User as UserIcon,
  Package,
  History
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { DeliveryFormDialog } from '@/components/delivery-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EntregasPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<'Matriz' | 'Valle'>('Matriz');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (user?.branch) {
      setSelectedBranch(user.branch);
    }
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, 'deliveries'), 
      where('branch', '==', selectedBranch),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Delivery[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({ 
          id: doc.id, 
          ...d,
          date: d.date.toDate()
        } as Delivery);
      });
      setDeliveries(data);
    });
    
    return () => unsubscribe();
  }, [selectedBranch]);

  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return deliveries.filter(d => 
      d.productName.toLowerCase().includes(query) || 
      d.receiverName.toLowerCase().includes(query) ||
      d.giverName.toLowerCase().includes(query)
    );
  }, [deliveries, searchQuery]);

  const branchColor = selectedBranch === 'Matriz' ? 'text-pink-600' : 'text-purple-700';
  const branchBg = selectedBranch === 'Matriz' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-purple-700 hover:bg-purple-800';
  const headerBg = selectedBranch === 'Matriz' ? 'bg-pink-50' : 'bg-purple-50';

  return (
    <div className="min-h-screen w-full bg-muted/5">
      
      <main className="container py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/inventario">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className={cn("text-3xl font-black tracking-tight uppercase", branchColor)}>
                Entregas: {selectedBranch}
              </h1>
              <p className="text-muted-foreground font-medium">Registro de salida de insumos a colaboradoras.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={selectedBranch === "Matriz" ? "default" : "ghost"}
                onClick={() => setSelectedBranch("Matriz")}
                className={cn("h-9", selectedBranch === "Matriz" && "bg-pink-600")}
              >
                Matriz
              </Button>
              <Button
                variant={selectedBranch === "Valle" ? "default" : "ghost"}
                onClick={() => setSelectedBranch("Valle")}
                className={cn("h-9", selectedBranch === "Valle" && "bg-purple-700")}
              >
                Valle
              </Button>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className={cn("font-bold text-white", branchBg)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Entrega
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por insumo o persona..." 
            className="pl-10 h-11 bg-white border-primary/20 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className={cn("pb-4", headerBg)}>
            <div className="flex items-center gap-2">
              <History className={cn("h-5 w-5", branchColor)} />
              <CardTitle className="text-lg font-black uppercase">Historial de Salidas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDeliveries.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">FECHA</TableHead>
                    <TableHead className="font-bold">ENTREGA (ADMIN)</TableHead>
                    <TableHead className="font-bold">RECIBE</TableHead>
                    <TableHead className="font-bold">INSUMO / PRODUCTO</TableHead>
                    <TableHead className="font-bold text-center">CANTIDAD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id} className="hover:bg-muted/10">
                      <TableCell className="font-medium">
                        {format(delivery.date, "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="uppercase text-xs font-bold text-muted-foreground">
                        {delivery.giverName}
                      </TableCell>
                      <TableCell className="uppercase font-black text-primary">
                        {delivery.receiverName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold uppercase leading-none">{delivery.productName}</span>
                          {delivery.notes && <span className="text-[10px] text-muted-foreground italic mt-1">{delivery.notes}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-lg font-black px-3", branchBg)}>
                          {delivery.quantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-20 text-center text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay registros de entregas para esta búsqueda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {isFormOpen && (
        <DeliveryFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          branch={selectedBranch}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
