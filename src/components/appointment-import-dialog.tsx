

"use client";

import { useState, useCallback } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Event } from '@/lib/types';
import { UploadCloud, File, AlertCircle, FileCheck, FileX } from 'lucide-react';
import { es } from 'date-fns/locale';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, addDoc, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';

type AppointmentImportData = Omit<Event, 'id'>;

const excelSerialDateToJSDate = (serial: number): Date => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000000001;

  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

const parseDateTime = (dateValue?: string | number, timeValue?: string | number): Date | undefined => {
    if (dateValue === undefined) return undefined;

    let datePart: Date | undefined;
    
    if (typeof dateValue === 'number') {
        datePart = excelSerialDateToJSDate(dateValue);
    } else if (typeof dateValue === 'string') {
        const supportedDateFormats = ['dd/MM/yyyy', 'd/M/yy', 'MM/dd/yyyy', 'M/d/yy', 'yyyy-MM-dd', 'MM-dd-yyyy', 'yyyy/MM/dd'];
        for (const fmt of supportedDateFormats) {
            try {
                const parsed = new Date(dateValue.split('/').reverse().join('-'));
                if (isValid(parsed)) {
                    datePart = parsed;
                    break;
                }
            } catch(e) {}
        }
        if (!datePart && isValid(new Date(dateValue))) {
             datePart = new Date(dateValue);
        }
    }

    if (!datePart || !isValid(datePart)) return undefined;

    datePart = new Date(datePart.getUTCFullYear(), datePart.getUTCMonth(), datePart.getUTCDate());


    if (timeValue === undefined) {
        return datePart;
    }

    let hours = 0;
    let minutes = 0;

    if (typeof timeValue === 'number' && timeValue >= 0 && timeValue < 1) {
        let totalMinutes = Math.round(timeValue * 24 * 60);
        hours = Math.floor(totalMinutes / 60);
        minutes = totalMinutes % 60;
    } else if (typeof timeValue === 'string') {
        const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i;
        const match = timeValue.match(timeRegex);
        if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            const period = match[4]?.toUpperCase();
            if (period === 'PM' && hours < 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) { // Midnight case
                hours = 0;
            }
        } else {
             return datePart;
        }
    } else {
        return datePart;
    }
    
    datePart.setHours(hours);
    datePart.setMinutes(minutes);

    return datePart;
};


const importedAppColors = [
  '#FADBD8', // Light Pink
  '#D5F5E3', // Light Green
  '#FCF3CF', // Light Yellow
  '#D6EAF8', // Light Blue
  '#E8DAEF', // Light Purple
  '#FDEBD0', // Light Orange
  '#D4E6F1', // Light Steel Blue
  '#E5E7E9', // Light Gray
];


let colorIndex = 0;

const getNextColor = () => {
    const color = importedAppColors[colorIndex % importedAppColors.length];
    colorIndex++;
    return color;
};

const getColorFromTitle = (title: string): string => {
    // Simple hash function to get a color based on title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % importedAppColors.length);
    return importedAppColors[index];
};


const parseIcsDateTime = (dateTimeString: string): Date | null => {
    // e.g., 20241107T140000 or 20241107T190000Z
    if (!dateTimeString) return null;

    const cleanString = dateTimeString.endsWith('Z') ? dateTimeString.slice(0, -1) : dateTimeString;

    const year = parseInt(cleanString.substring(0, 4), 10);
    const month = parseInt(cleanString.substring(4, 6), 10);
    const day = parseInt(cleanString.substring(6, 8), 10);
    const hours = parseInt(cleanString.substring(9, 11), 10);
    const minutes = parseInt(cleanString.substring(11, 13), 10);
    const seconds = parseInt(cleanString.substring(13, 15), 10);

    if ([year, month, day, hours, minutes, seconds].some(isNaN)) {
        return null;
    }
    
    // Create date in local time zone, ignoring UTC 'Z'
    return new Date(year, month - 1, day, hours, minutes, seconds);
};

const processIcsData = (icsString: string, defaultBranch: 'Matriz' | 'Valle'): AppointmentImportData[] => {
    const events: Partial<AppointmentImportData>[] = [];
    const unfoldedIcs = icsString.replace(/\r\n\s/g, ''); // Unfold long lines
    const eventBlocks = unfoldedIcs.split('BEGIN:VEVENT');
    
    eventBlocks.forEach(block => {
        if (!block.includes('END:VEVENT')) return;
        
        const currentEvent: Partial<AppointmentImportData> = { 
            branch: defaultBranch,
            status: 'confirmed',
            amountPaid: 0,
            sessionNumber: 0,
            reminderSent: false,
            lateMinutes: 0,
            notifiedUsers: [],
            serviceIds: [],
            serviceNames: [],
            isImported: true,
            colorModified: false,
         };

        let dtstart: string | null = null;
        let dtend: string | null = null;
        const lines = block.split('\r\n');

        lines.forEach(line => {
            const [keyWithParams, ...valueParts] = line.split(':');
            if (!keyWithParams || !valueParts.length) return;
            const value = valueParts.join(':');
            const [key] = keyWithParams.split(';');

            switch(key.toUpperCase()) {
                case 'DTSTART':
                    dtstart = value;
                    break;
                case 'DTEND':
                    dtend = value;
                    break;
                case 'SUMMARY':
                    currentEvent.title = value;
                    currentEvent.clientName = value;
                    currentEvent.clientName_lowercase = value.toLowerCase();
                    break;
                case 'DESCRIPTION':
                    currentEvent.description = value.replace(/\\n/g, '\n');
                    break;
                case 'LOCATION':
                     if (value.toLowerCase().includes('matriz')) {
                        currentEvent.branch = 'Matriz';
                     } else if (value.toLowerCase().includes('valle')) {
                        currentEvent.branch = 'Valle';
                     }
                    break;
                case 'STATUS':
                     currentEvent.status = value.toUpperCase() === 'CANCELLED' ? 'cancelled' : 'confirmed';
                     break;
            }
        });

        if (dtstart) currentEvent.startDate = parseIcsDateTime(dtstart) ?? undefined;
        if (dtend) currentEvent.endDate = parseIcsDateTime(dtend) ?? undefined;
        
        if (currentEvent.startDate && currentEvent.endDate && currentEvent.title) {
            // Exclude all-day events
            const isAllDay = (
                currentEvent.startDate.getHours() === 0 && currentEvent.startDate.getMinutes() === 0 &&
                currentEvent.endDate.getHours() === 0 && currentEvent.endDate.getMinutes() === 0 &&
                (currentEvent.endDate.getTime() - currentEvent.startDate.getTime()) % (24*60*60*1000) === 0
            );

            if (!isAllDay) {
                 if (currentEvent.startDate) {
                    currentEvent.startDate.setHours(currentEvent.startDate.getHours() - 5);
                 }
                 if (currentEvent.endDate) {
                    currentEvent.endDate.setHours(currentEvent.endDate.getHours() - 5);
                 }
                 currentEvent.color = getColorFromTitle(currentEvent.title);
                 events.push(currentEvent);
            }
        }
    });

    return events.filter(e => e.startDate && isValid(e.startDate) && e.endDate && isValid(e.endDate) && e.title) as AppointmentImportData[];
};


const processSheetData = (data: any[], branch: 'Matriz' | 'Valle'): AppointmentImportData[] => {
  if (data.length === 0) return [];
  
  const originalHeaders = Object.keys(data[0]);

  const mapping: Record<string, string | undefined> = {};
    for (const field in fieldMappings) {
        mapping[field] = originalHeaders.find(header => findColumn(header, fieldMappings[field]));
    }

  return data.map((row) => {
    const startDateVal = mapping.startDate ? row[mapping.startDate] : undefined;
    const startTimeVal = mapping.startTime ? row[mapping.startTime] : undefined;
    const endDateVal = mapping.endDate ? row[mapping.endDate] : (mapping.startDate ? row[mapping.startDate] : undefined);
    const endTimeVal = mapping.endTime ? row[mapping.endTime] : undefined;

    const startDate = parseDateTime(startDateVal, startTimeVal);
    let endDate = parseDateTime(endDateVal, endTimeVal);
    
    if (!startDate || !isValid(startDate)) return null;
    if (!endDate || !isValid(endDate) || endDate <= startDate) {
        endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    }
    
    const titleVal = mapping.title ? row[mapping.title] : 'Cita sin título';
    const branchVal = mapping.branch ? row[mapping.branch] as 'Matriz' | 'Valle' : branch;
    const descriptionVal = mapping.description ? row[mapping.description] : '';
    const statusVal = mapping.status ? String(row[mapping.status]).toLowerCase() : 'confirmed';
    const amountPaidVal = mapping.amountPaid ? parseFloat(String(row[mapping.amountPaid])) : 0;
    const reminderSentVal = mapping.reminderSent ? ['true', 'yes', 'si', 'enviado', '1'].includes(String(row[mapping.reminderSent]).toLowerCase()) : false;

    const appointmentData: AppointmentImportData = {
      title: titleVal || 'Cita sin título',
      clientName: titleVal || 'Cita sin título',
      clientName_lowercase: (titleVal || 'Cita sin título').toLowerCase(),
      startDate: startDate,
      endDate: endDate,
      branch: branchVal,
      description: descriptionVal || '',
      color: getColorFromTitle(titleVal || ''),
      status: statusVal === 'cancelled' || statusVal === 'cancelada' ? 'cancelled' : 'confirmed',
      amountPaid: isNaN(amountPaidVal) ? 0 : amountPaidVal,
      reminderSent: reminderSentVal,
      sessionNumber: 0,
      lateMinutes: 0,
      notifiedUsers: [],
      serviceIds: [],
      serviceNames: [],
      isImported: true,
      colorModified: false,
    };
    
    return appointmentData;
  }).filter((item): item is AppointmentImportData => item !== null);
};

const fieldMappings: Record<string, string[]> = {
    startDate: ['fecha', 'start date', 'fecha de inicio'],
    startTime: ['inicio', 'start time', 'hora de inicio', 'hora inicio', 'hora'],
    endDate: ['fecha fin', 'end date', 'fecha de fin'],
    endTime: ['fin', 'end time', 'hora de fin', 'hora fin'],
    title: ['paciente', 'cliente', 'asunto', 'title', 'subject', 'nombre'],
    description: ['descripcion', 'descripción', 'description', 'comentarios', 'observaciones'],
    branch: ['sucursal', 'branch', 'location'],
    status: ['estado', 'status'],
    amountPaid: ['pagado', 'amount paid', 'abono'],
    reminderSent: ['recordatorio enviado', 'reminder sent'],
};

const findColumn = (header: string, aliases: string[]) => {
    const lowerHeader = header.toLowerCase().trim();
    return aliases.some(alias => lowerHeader.includes(alias));
};

export function AppointmentImportDialog({ isOpen, onOpenChange, branch, onImportSuccess }: AppointmentImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [processedData, setProcessedData] = useState<AppointmentImportData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setFile(null);
    setTotalRows(0);
    setProcessedData([]);
    colorIndex = 0; // Reset color index for each new file

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
            let appointments: AppointmentImportData[] = [];
            
            if (selectedFile.name.endsWith('.csv')) {
                const result = Papa.parse<any>(fileContent as string, { header: true, skipEmptyLines: true });
                if (result.errors.length > 0) throw new Error(result.errors.map(e => e.message).join(', '));
                parsedData = result.data;
                appointments = processSheetData(parsedData, branch);
            } else if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
                 const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true, raw: false });
                 const sheetName = workbook.SheetNames[0];
                 const worksheet = workbook.Sheets[sheetName];
                 parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd/mm/yyyy' });
                 appointments = processSheetData(parsedData, branch);
            } else if (selectedFile.name.endsWith('.ics')) {
                appointments = processIcsData(fileContent as string, branch);
                parsedData = appointments; // for row count
            } else {
                throw new Error("Formato de archivo no soportado. Usa .csv, .xlsx, .xls o .ics.");
            }
            
            setTotalRows(parsedData.length);
            setProcessedData(appointments);

            if (appointments.length === 0 && parsedData.length > 0) {
                setError("El archivo se leyó, pero no se encontraron citas válidas. Revisa que las columnas y formatos sean correctos.")
            }

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
      
      if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
        reader.readAsBinaryString(selectedFile);
      } else {
        reader.readAsText(selectedFile, 'UTF-8');
      }
    }
  }, [branch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'text/csv': ['.csv'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'text/calendar': ['.ics'],
    },
    maxFiles: 1,
  });

  const handleClose = () => {
    setFile(null);
    setTotalRows(0);
    setProcessedData([]);
    setError(null);
    onOpenChange(false);
  }
  
  const handleConfirmImport = async () => {
    if (processedData.length === 0 || !user) return;
  
    const CHUNK_SIZE = 400;
    const chunks = [];
    for (let i = 0; i < processedData.length; i += CHUNK_SIZE) {
      chunks.push(processedData.slice(i, i + CHUNK_SIZE));
    }
  
    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((eventData) => {
          const eventRef = doc(collection(db, 'events'));
          const newEventData = {
            ...eventData,
            clientName_lowercase: (eventData.clientName || '').toLowerCase(),
            createdBy: {
              uid: user.id,
              name: user.name,
              initials: user.name.split(' ').map((n) => n[0]).join('').toUpperCase(),
            },
            createdAt: Timestamp.now().toDate(),
          };
          batch.set(eventRef, newEventData);
  
          // Create a detailed log for each imported appointment
          const logRef = doc(collection(db, 'activity_log'));
          const logAction = `Cita importada para el ${format(eventData.startDate, "d MMM yyyy, HH:mm", { locale: es })}`;
          batch.set(logRef, {
            userId: user.id,
            userName: user.name,
            action: logAction,
            timestamp: Timestamp.now(),
            eventId: eventRef.id,
            // Assuming clientName is good enough for a temporary link.
            // A more robust solution might search for a client by name first.
            clientName: eventData.clientName,
          });
        });
        await batch.commit();
      }
  
      // General log for the import action
      await addDoc(collection(db, 'activity_log'), {
        userId: user.id,
        userName: user.name,
        action: `Importó ${processedData.length} citas a la sucursal ${branch}.`,
        timestamp: Timestamp.now(),
      });
  
      toast({
        title: 'Importación Exitosa',
        description: `${processedData.length} citas han sido guardadas en la base de datos con su respectivo registro de actividad.`,
      });
      onImportSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error al importar citas: ', error);
      toast({
        title: 'Error de importación',
        description: `No se pudieron guardar las citas. Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Citas desde Archivo</DialogTitle>
          <DialogDescription>
             Sube un archivo para añadir citas al calendario. Las citas importadas se guardarán de forma permanente.
             <br/>
             Formatos recomendados: <strong>Fecha</strong>: `dd/MM/yyyy` (ej. 28/10/2025), <strong>Hora</strong>: `HH:mm` o con AM/PM (ej. `14:30` o `2:30 PM`).
          </DialogDescription>
        </DialogHeader>

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {!processedData.length && (
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                {isDragActive ? (
                <p>Suelta el archivo aquí...</p>
                ) : (
                <p>Arrastra un archivo (.csv, .xlsx, .ics) aquí, o haz clic para seleccionarlo.</p>
                )}
                 {isParsing && <p className="mt-2 text-sm text-muted-foreground">Procesando archivo...</p>}
            </div>
        )}
        
        {processedData.length > 0 && (
             <div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md mb-4">
                    <FileCheck className="w-6 h-6 text-green-600" />
                    <div>
                        <p className="font-medium text-sm">{file?.name}</p>
                        <p className="text-xs text-muted-foreground">
                        Se encontraron {totalRows} filas. Se importarán <strong>{processedData.length} citas válidas</strong>.
                        </p>
                    </div>
                </div>
                 <ScrollArea className="h-72">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Horario</TableHead>
                                <TableHead>Sucursal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedData.slice(0, 10).map((cita, index) => (
                                <TableRow key={index}>
                                    <TableCell>{cita.clientName}</TableCell>
                                    <TableCell>{isValid(cita.startDate) ? format(cita.startDate, "dd/MM/yyyy") : 'Fecha inválida'}</TableCell>
                                    <TableCell>{isValid(cita.startDate) && isValid(cita.endDate) ? `${format(cita.startDate, 'HH:mm')} - ${format(cita.endDate, 'HH:mm')}` : 'Hora inválida'}</TableCell>
                                    <TableCell>{cita.branch}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {processedData.length > 10 && (
                        <p className="text-center text-sm text-muted-foreground mt-2">...y {processedData.length - 10} más.</p>
                    )}
                 </ScrollArea>
             </div>
        )}

        {file && !processedData.length && !isParsing && !error && (
            <Alert variant="destructive">
                <FileX className="h-4 w-4" />
                <AlertTitle>No se encontraron citas válidas</AlertTitle>
                <AlertDescription>El archivo fue leído, pero ninguna fila pudo ser procesada como una cita válida. Por favor, revisa el formato del archivo.</AlertDescription>
            </Alert>
        )}

         {!processedData.length && !isParsing && totalRows === 0 && file && !error && (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Archivo vacío o inválido</AlertTitle>
                <AlertDescription>No se encontraron datos en el archivo. Verifica que tenga el formato correcto y no esté vacío.</AlertDescription>
            </Alert>
        )}

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={processedData.length === 0 || isParsing}>
              Importar {processedData.length > 0 ? processedData.length : ''} Citas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AppointmentImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  branch: 'Matriz' | 'Valle';
  onImportSuccess: () => void;
}
