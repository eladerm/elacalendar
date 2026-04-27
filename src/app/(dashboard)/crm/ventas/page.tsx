"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Package, Pencil, Trash2, DollarSign, Tag } from 'lucide-react';
import { cn } from "@/lib/utils";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
};

const emptyProduct = { name: '', price: 0, description: '', category: '', imageUrl: '' };

export default function VentasPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>(emptyProduct);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'crm_products'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(emptyProduct);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingProduct.id) {
        const { id, ...data } = editingProduct;
        await updateDoc(doc(db, 'crm_products', id), data);
        toast({ title: 'Producto actualizado' });
      } else {
        await addDoc(collection(db, 'crm_products'), {
          ...editingProduct,
          price: Number(editingProduct.price),
          createdAt: serverTimestamp()
        });
        toast({ title: 'Producto creado exitosamente' });
      }
      setIsModalOpen(false);
    } catch {
      toast({ title: 'Error al guardar producto', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'crm_products', id));
      toast({ title: 'Producto eliminado' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const formatPrice = (p: number) => `$${Number(p).toFixed(2)}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Catálogo de Productos
          </h1>
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1">
            {products.length} productos disponibles para cotizaciones y pedidos
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 px-6 rounded-xl h-11">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Productos en Catálogo', value: products.length, icon: Package },
          { label: 'Precio Promedio', value: products.length > 0 ? formatPrice(products.reduce((s, p) => s + p.price, 0) / products.length) : '$0', icon: DollarSign },
          { label: 'Categorías', value: [...new Set(products.map(p => p.category).filter(Boolean))].length, icon: Tag },
        ].map(m => (
          <Card key={m.label} className="bg-card border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2 bg-muted rounded-xl group-hover:bg-primary/20 transition-colors shrink-0">
                <m.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{m.label}</p>
                <p className="text-2xl font-black text-foreground mt-0.5">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <Card className="bg-card border-border rounded-2xl">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-black text-sm uppercase tracking-widest">No hay productos en el catálogo aún</p>
            <p className="text-muted-foreground/60 text-xs mt-2">Crea tu primer producto para empezar a generar pedidos desde el chat</p>
            <Button onClick={handleOpenCreate} className="mt-6 bg-primary text-primary-foreground font-black uppercase rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Crear Primer Producto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="bg-card border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group">
              {p.imageUrl ? (
                <div className="h-36 bg-muted overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-36 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-b border-border">
                  <Package className="w-12 h-12 text-primary/30" />
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-foreground text-sm truncate">{p.name}</h3>
                    {p.category && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 mt-1 inline-block">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black text-primary ml-3 shrink-0">{formatPrice(p.price)}</span>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{p.description}</p>
                )}
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button onClick={() => handleOpenEdit(p)} variant="outline" size="sm" className="flex-1 border-border font-black text-xs uppercase rounded-xl h-8">
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button onClick={() => handleDelete(p.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl border border-destructive/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border text-foreground p-0 overflow-hidden">
          <div className="bg-primary/10 p-6 border-b border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-black italic uppercase text-primary">
                {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre del Producto *</label>
              <Input required value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="bg-background border-border font-bold" placeholder="Ej. Sesión de Depilación Láser" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Precio (USD) *</label>
                <Input required type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} className="bg-background border-border font-bold" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Categoría</label>
                <Input value={editingProduct.category || ''} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="bg-background border-border font-bold" placeholder="Ej. Tratamientos" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descripción</label>
              <textarea
                rows={3}
                value={editingProduct.description || ''}
                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className="w-full text-sm p-2.5 bg-background border border-border rounded-xl outline-none font-bold resize-none focus:border-primary transition-colors"
                placeholder="Descripción breve del producto o servicio..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">URL de Imagen (opcional)</label>
              <Input value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })} className="bg-background border-border font-bold font-mono text-xs" placeholder="https://..." />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase">
                {isEditMode ? 'Guardar Cambios' : <><Plus className="w-4 h-4 mr-1.5" />Crear Producto</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
