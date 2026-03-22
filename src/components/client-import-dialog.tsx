"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Client } from '@/lib/types';
import { UploadCloud, File, AlertCircle, CheckCircle2, UserPlus, Users, Loader2 } from 'lucide-react';
import { es } from 'date-fns/locale';
import { parse, isValid } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

type ClientImportData = Omit<Client, 'id'>;

interface ClientImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (clients: ClientImportData[]) => void;
}

// Mapa de alias para las columnas
const fieldMappings: Record<keyof ClientImportData | 'fullName', string[]> = {
    name: ['nombre', 'first name', 'name', 'nombres'],
    lastName: ['apellido', 'last name', 'surname', 'apellidos'],
    idNumber: ['cedula', 'id', 'documento', 'dni', 'nui', 'identificacion', 'cédula'],
    phone: ['celular', 'telefono', 'phone', 'mobile', 'teléfono', 'cel'],
    email: ['correo', 'email', 'mail', 'e-mail'],
    address: ['direccion', 'address', 'dirección', 'domicilio'],
    branch: ['sucursal', 'branch', 'local', 'ubicacion', 'ubicación'],
    gender: ['sexo', 'genero', 'gender', 'género'],
    treatmentType: ['tratamiento', 'tipo de tratamiento', 'treatment', 'servicio'],
    birthDate: ['fecha de nacimiento', 'nacimiento', 'birth date', 'birthday', 'f.nac', 'f_nacimiento'],
    registrationDate: ['fecha de ingreso', 'ingreso', 'registration date', 'created at', 'fecha_ingreso'],
    fullName: ['nombre completo', 'full name', 'cliente', 'paciente', 'usuario'], // Para archivos que traen todo en una sola columna
    totalPaid: [],
    totalSessions: [],
    totalLateArrivals: [],
    totalMinutesLate: []
};

const findHeader = (row: any, aliases: string[]): string | undefined => {
    const headers = Object.keys(row);
    return headers.find(h => {
        const normalizedHeader = h.toLowerCase().trim();
        return aliases.some(alias => normalizedHeader === alias || normalizedHeader.includes(alias));
    });
};

const parseFlexibleDate = (dateString: any): Date | undefined => {
    if (!dateString) return undefined;
    
    // Si ya es un objeto Date
    if (dateString instanceof Date && !isNaN(dateString.getTime())) return dateString;

    // Si es el formato numérico de Excel
    if (typeof dateString === 'number') {
        if (dateString > 0) {
            return new Date((dateString - 25569) * 86400 * 1000);
        }
        return undefined;
    }

    const str = String(dateString).trim();
    const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yy', 'd/M/yy'];
    
    for (const fmt of formats) {
        try {
            const parsedDate = parse(str, fmt, new Date(), { locale: es });
            if (isValid(parsedDate)) return parsedDate;
        } catch (e) {}
    }

    const direct = new Date(str);
    if (isValid(direct)) return direct;

    return undefined;
};

const processFlexibleData = (data: any[]): ClientImportData[] => {
  if (data.length === 0) return [];

  return data.map(row => {
    // Intentar encontrar las columnas
    const nameKey = findHeader(row, fieldMappings.name);
    const lastNameKey = findHeader(row, fieldMappings.lastName);
    const fullNameKey = findHeader(row, fieldMappings.fullName);
    const idKey = findHeader(row, fieldMappings.idNumber);
    const phoneKey = findHeader(row, fieldMappings.phone);
    const emailKey = findHeader(row, fieldMappings.email);
    const addressKey = findHeader(row, fieldMappings.address);
    const branchKey = findHeader(row, fieldMappings.branch);
    const genderKey = findHeader(row, fieldMappings.gender);
    const treatmentKey = findHeader(row, fieldMappings.treatmentType);
    const birthKey = findHeader(row, fieldMappings.birthDate);
    const regKey = findHeader(row, fieldMappings.registrationDate);

    let name = nameKey ? String(row[nameKey]).trim() : '';
    let lastName = lastNameKey ? String(row[lastNameKey]).trim() : '';

    // Si no hay nombre/apellido separado pero hay nombre completo
    if (!name && fullNameKey) {
        const full = String(row[fullNameKey]).trim().split(' ');
        if (full.length > 0) {
            name = full[0];
            lastName = full.slice(1).join(' ');
        }
    }

    if (!name) return null;

    const clientData: ClientImportData = {
      name: name.toUpperCase(),
      lastName: lastName.toUpperCase(),
      idNumber: idKey ? String(row[idKey]).trim() : '',
      phone: phoneKey ? String(row[phoneKey]).trim() : '',
      email: emailKey ? String(row[emailKey]).trim().toLowerCase() : '',
      address: addressKey ? String(row[addressKey]).trim() : '',
      branch: (branchKey ? String(row[branchKey]).trim() : '') as any,
      gender: genderKey ? String(row[genderKey]).trim().toLowerCase() : '',
      treatmentType: treatmentKey ? String(row[treatmentKey]).trim() : '',
      birthDate: parseFlexibleDate(birthKey && row[birthKey]),
      registrationDate: parseFlexibleDate(regKey && row[regKey]) || new Date(),
    };

    return clientData;
  }).filter((c): c is ClientImportData => c !== null);
};


export function ClientImportDialog({ isOpen, onOpenChange, onImport }: ClientImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [allFileData, setAllFileData] = useState<ClientImportData[]>([]);
  const [newClients, setNewClients] = useState<ClientImportData[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const compareWithDatabase = async (importedData: ClientImportData[]) => {
    setIsParsing(true);
    try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const existingClients = querySnapshot.docs.map(doc => doc.data() as Client);

        const existingIds = new Set(existingClients.map(c => c.idNumber?.toString().trim()).filter(Boolean));
        const existingEmails = new Set(existingClients.map(c => c.email?.toString().trim().toLowerCase()).filter(Boolean));
        const existingFullNames = new Set(existingClients.map(c => `${c.name} ${c.lastName}`.trim().toLowerCase()));

        const uniqueInFile: ClientImportData[] = [];
        const seenInFile = new Set<string>();
        let duplicates = 0;

        for (const client of importedData) {
            const fullName = `${client.name} ${client.lastName}`.trim().toLowerCase();
            const id = client.idNumber?.toString().trim();
            const email = client.email?.toString().trim().toLowerCase();

            const fileKey = id || email || fullName;
            if (seenInFile.has(fileKey)) {
                duplicates++;
                continue;
            }
            seenInFile.add(fileKey);

            const existsById = id && existingIds.has(id);
            const existsByEmail = email && existingEmails.has(email);
            const existsByName = existingFullNames.has(fullName);

            if (existsById || existsByEmail || existsByName) {
                duplicates++;
            } else {
                uniqueInFile.push(client);
            }
        }

        setNewClients(uniqueInFile);
        setDuplicateCount(duplicates);
    } catch (err) {
        console.error("Error comparing data:", err);
        setError("Error al conectar con la base de datos para verificar duplicados.");
    } finally {
        setIsParsing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setFile(null);
    setAllFileData([]);
    setNewClients([]);
    setDuplicateCount(0);

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setIsParsing(true);
      
      const reader = new FileReader();

      reader.onload = async (event) => {
          const fileContent = event.target?.result;
          if (!fileContent) {
              setError('No se pudo leer el archivo.');
              setIsParsing(false);
              return;
          }

          try {
            let parsedData: any[] = [];
            if (selectedFile.name.endsWith('.csv')) {
                const result = Papa.parse<any>(fileContent as string, {
                    header: true,
                    skipEmptyLines: true,
                });
                if (result.errors.length > 0) {
                    throw new Error(result.errors.map(e => e.message).join(', '));
                }
                parsedData = result.data;
            } else {
                 const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                 const sheetName = workbook.SheetNames[0];
                 const worksheet = workbook.Sheets[sheetName];
                 parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            }
            
            const processed = processFlexibleData(parsedData);
            if (processed.length === 0) {
                throw new Error("No se encontraron clientes válidos en el archivo. Asegúrate de que las columnas tengan nombres descriptivos como 'Nombre' o 'Cliente'.");
            }
            setAllFileData(processed);
            await compareWithDatabase(processed);
          } catch (err: any) {
              setError(`Error al procesar el archivo: ${err.message}`);
              setIsParsing(false);
          }
      };

      reader.onerror = () => {
          setError('Error al leer el archivo.');
          setIsParsing(false);
      }
      
      if (selectedFile.name.endsWith('.csv')) {
        reader.readAsText(selectedFile);
      } else {
        reader.readAsBinaryString(selectedFile);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'text/csv': ['.csv'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleClose = () => {
    if (isParsing) return;
    setFile(null);
    setAllFileData([]);
    setNewClients([]);
    setDuplicateCount(0);
    setError(null);
    onOpenChange(false);
  }
  
  const handleConfirmImport = () => {
    onImport(newClients);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Actualizar Base de Datos de Clientes</DialogTitle>
          <DialogDescription>
            Sube tu archivo para sincronizar con el sistema. Ahora soportamos mapeo inteligente de columnas (Nombre, Cédula, Email, etc.).
          </DialogDescription>
        </DialogHeader>

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {!allFileData.length && !isParsing && (
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                {isDragActive ? (
                <p>Suelta el archivo aquí...</p>
                ) : (
                <div className="space-y-2">
                    <p className="font-medium">Arrastra un archivo Excel o CSV aquí</p>
                    <p className="text-xs text-muted-foreground">Analizaremos las columnas automáticamente para compararlas con tu base de datos actual.</p>
                </div>
                )}
            </div>
        )}

        {isParsing && (
            <div className="py-10 text-center space-y-4">
                <Loader2 className="animate-spin h-8 w-8 border-primary mx-auto text-primary" />
                <p className="text-muted-foreground">Analizando columnas y verificando duplicados en la base de datos...</p>
            </div>
        )}

        {file && allFileData.length > 0 && !isParsing && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{allFileData.length}</p>
                    <p className="text-xs text-muted-foreground uppercase">En el archivo</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 text-center">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-2xl font-bold text-orange-700">{duplicateCount}</p>
                    <p className="text-xs text-orange-600 uppercase">Ya registrados</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                    <UserPlus className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <p className="text-2xl font-bold text-green-700">{newClients.length}</p>
                    <p className="text-xs text-green-600 uppercase">Nuevos por agregar</p>
                </div>
            </div>

            {newClients.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Previsualización de nuevos clientes:</p>
                    <ScrollArea className="h-60 border rounded-md">
                        <Table>
                        <TableHeader className="bg-muted/50 sticky top-0">
                            <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Cédula</TableHead>
                            <TableHead>Correo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {newClients.slice(0, 20).map((client, index) => (
                            <TableRow key={index}>
                                <TableCell className="uppercase font-medium">{client.name} {client.lastName}</TableCell>
                                <TableCell>{client.idNumber || '---'}</TableCell>
                                <TableCell className="text-xs">{client.email || '---'}</TableCell>
                                <TableCell className="text-xs">{client.phone || '---'}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                        {newClients.length > 20 && (
                            <p className="text-center text-xs text-muted-foreground py-2 italic">
                                Mostrando los primeros 20 de {newClients.length} clientes nuevos encontrados.
                            </p>
                        )}
                    </ScrollArea>
                </div>
            ) : (
                <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Base de datos actualizada</AlertTitle>
                    <AlertDescription>
                        No hemos encontrado clientes nuevos en este archivo que no estén ya en tu sistema.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isParsing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmImport} 
            disabled={newClients.length === 0 || isParsing}
          >
            {newClients.length > 0 ? `Importar ${newClients.length} Clientes Nuevos` : 'Cerrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
