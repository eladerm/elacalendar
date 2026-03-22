
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PackagePlus, Plus, BookOpen, Truck, Store } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Product } from "@/lib/types"
import { Badge } from "./ui/badge"

interface ProductSearchComboboxProps {
  products: Product[];
  catalogNames?: string[];
  value: string;
  onChange: (value: string) => void;
  onCatalogSelect?: (name: string) => void;
  placeholder?: string;
  showStock?: boolean;
}

export function ProductSearchCombobox({ 
  products, 
  catalogNames = [],
  value, 
  onChange, 
  onCatalogSelect,
  placeholder = "Seleccionar producto...",
  showStock = true
}: ProductSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedProduct = products.find(
    (p) => p.id === value
  );

  // Mapeamos los nombres que ya existen en inventario para marcar sugerencias como "VARIANTE"
  const inventoryNames = new Set(products.map(p => p.name.toUpperCase()));
  
  // Ahora mostramos todas las sugerencias que coincidan con la búsqueda, sin ocultar las existentes
  const filteredCatalog = catalogNames
    .filter(name => name.toUpperCase().includes(search.toUpperCase()))
    .slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 px-3 font-medium border-primary/20 hover:border-primary/40 text-xs"
        >
          <span className="truncate uppercase">
            {selectedProduct
              ? `${selectedProduct.name} - ${selectedProduct.brand} (${selectedProduct.location === 'BODEGA' ? 'B' : 'C'})`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput 
            placeholder="Buscar..." 
            value={search}
            onValueChange={setSearch}
            className="h-8 text-xs"
          />
          <CommandList className="max-h-60">
            <CommandEmpty className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-2">No encontrado.</p>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full text-[9px] font-black uppercase h-7"
                onClick={() => {
                  onChange("new")
                  setOpen(false)
                }}
              >
                <PackagePlus className="mr-1 h-3 w-3" />
                Registrar Nuevo
              </Button>
            </CommandEmpty>
            
            <CommandGroup>
                <CommandItem
                    value="new"
                    onSelect={() => {
                        onChange("new")
                        setOpen(false)
                    }}
                    className="text-primary font-bold text-xs"
                >
                    <PackagePlus className="mr-2 h-3 w-3" />
                    -- Registrar Nuevo --
                </CommandItem>
            </CommandGroup>

            {filteredCatalog.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Sugerencias del Catálogo">
                  {filteredCatalog.map((name) => {
                    const isVariant = inventoryNames.has(name.toUpperCase());
                    return (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          onCatalogSelect?.(name);
                          setOpen(false);
                        }}
                        className="text-[10px] font-bold uppercase"
                      >
                        <BookOpen className="mr-2 h-3 w-3 text-muted-foreground" />
                        {name}
                        <Badge 
                          variant={isVariant ? "outline" : "default"} 
                          className={cn(
                            "ml-auto text-[8px] h-4",
                            isVariant ? "border-primary/40 text-primary" : "bg-green-600 text-white"
                          )}
                        >
                          {isVariant ? "VARIANTE" : "NUEVO"}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup heading="Inventario Actual">
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.brand} ${product.code}`}
                  onSelect={() => {
                    onChange(product.id)
                    setOpen(false)
                  }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Check
                        className={cn(
                        "h-3 w-3 shrink-0",
                        value === product.id ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold uppercase text-[10px] truncate">{product.name}</span>
                          <Badge variant="outline" className="text-[7px] px-1 h-3 font-black">
                            {product.location === 'BODEGA' ? <Truck className="w-2 h-2 mr-0.5"/> : <Store className="w-2 h-2 mr-0.5"/>}
                            {product.location === 'BODEGA' ? 'B' : 'C'}
                          </Badge>
                        </div>
                        <span className="text-[9px] text-muted-foreground uppercase truncate">
                            {product.brand} {product.packageSize ? `(${product.packageSize})` : ''}
                        </span>
                    </div>
                  </div>
                  {showStock && (
                    <Badge variant={product.sealedCount <= product.minStock ? "destructive" : "secondary"} className="ml-2 shrink-0 text-[8px] font-black px-1.5 h-4">
                        {product.sealedCount} {product.unit}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
