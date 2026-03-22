
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Client } from "@/lib/types"

interface ClientSearchComboboxProps {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
}

export function ClientSearchCombobox({ clients, value, onChange }: ClientSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedClient = clients.find(
    (client) => client.id === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedClient
            ? `${selectedClient.name} ${selectedClient.lastName}`
            : "Selecciona un cliente o crea uno nuevo"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput 
            placeholder="Buscar cliente por nombre o cédula..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
            <CommandGroup>
                <CommandItem
                    value="new"
                    onSelect={() => {
                        onChange("new")
                        setOpen(false)
                    }}
                >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value === "new" ? "opacity-100" : "opacity-0"
                        )}
                    />
                    -- Crear Nuevo Cliente --
                </CommandItem>
              {search.length > 0 && clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.lastName} ${client.idNumber || ''}`}
                  onSelect={() => {
                    onChange(client.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name} {client.lastName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
