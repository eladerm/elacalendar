
"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
import type { Service } from '@/lib/types';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

type ServiceImportData = Omit<Service, 'id'>;

interface ServiceImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: ServiceImportData[]) => void;
}

const processData = (data: any[]): ServiceImportData[] => {
  return data.map(row => {
    const serviceData: Partial<ServiceImportData> = {
      code: row.CODIGO || '',
      name: row.NOMBRE || '',
      type: row.TIPO || '',
      duration: Number(row.DURACION) || 0,
    };

    return serviceData as ServiceImportData;
  }).filter(item => item.name && item.code); // Ensure name and code are present
};


export function ServiceImportDialog({ isOpen, onOpenChange, onImport }: ServiceImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ServiceImportData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setFile(null);
    setData([]);

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setIsParsing(true);
      
      const reader = new FileReader();

      reader.onload = (event) => {
          const fileContent = event.target?.result;
          if (!fileContent) {
              setError('No se pudo leer el archivo.');
              setIsParsing(false);
              return;
          }

          try {
            let parsedData: any[] = [];
            if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
                 const workbook = XLSX.read(fileContent, { type: 'binary' });
                 const sheetName = workbook.SheetNames[0];
                 const worksheet = workbook.Sheets[sheetName];
                 parsedData = XLSX.utils.sheet_to_json(worksheet);
            } else {
                throw new Error("Formato de archivo no soportado. Por favor, usa .xlsx o .xls");
            }
            
            const items = processData(parsedData);
            setData(items);
          } catch (err: any) {
              setError(`Error al procesar el archivo: ${err.message}`);
          } finally {
              setIsParsing(false);
          }
      };

      reader.onerror = () => {
          setError('Error al leer el archivo.');
          setIsParsing(false);
      }
      
      reader.readAsBinaryString(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleClose = () => {
    setFile(null);
    setData([]);
    setError(null);
    onOpenChange(false);
  }
  
  const handleConfirmImport = () => {
    onImport(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Servicios desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx, .xls) con los servicios. El código y el nombre son obligatorios.
            Columnas reconocidas: CODIGO, NOMBRE, TIPO, DURACION.
          </DialogDescription>
        </DialogHeader>

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {!data.length && (
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                {isDragActive ? (
                <p>Suelta el archivo aquí...</p>
                ) : (
                <p>Arrastra un archivo Excel aquí, o haz clic para seleccionarlo.</p>
                )}
                 {isParsing && <p className="mt-2 text-sm text-muted-foreground">Procesando archivo...</p>}
            </div>
        )}

        {file && !data.length && !isParsing && !error &&(
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Archivo vacío o inválido</AlertTitle>
                <AlertDescription>No se encontraron datos de servicios en el archivo. Verifica que tenga el formato correcto y no esté vacío.</AlertDescription>
            </Alert>
        )}

        {data.length > 0 && (
          <div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md mb-4">
                <File className="w-5 h-5"/>
                <span className="font-medium">{file?.name}</span>
                <span className="text-sm text-muted-foreground">- {data.length} servicios encontrados</span>
            </div>
            <ScrollArea className="h-72">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duración</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.slice(0, 10).map((item, index) => (
                    <TableRow key={index}>
                        <TableCell>{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.duration}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
                 {data.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground mt-2">...y {data.length - 10} más.</p>
                )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmImport} disabled={data.length === 0 || isParsing}>
            Importar {data.length > 0 ? data.length : ''} Servicios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
