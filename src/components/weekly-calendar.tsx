
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
  setHours,
  getHours,
  getMinutes,
  differenceInMinutes,
  setMinutes,
  addMinutes,
  roundToNearestMinutes,
  startOfDay,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Upload, GripVertical, Search, Download, Plus, CalendarDays, X, Loader2, Smile, User as UserIcon, Settings, Check, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import type { Event, Client } from '@/lib/types';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  runTransaction,
  getDocs,
  limit,
} from 'firebase/firestore';
import { cn, hexToRgba } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { RescheduleDialog } from './reschedule-dialog';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import * as ics from 'ics';
import { saveAs } from 'file-saver';
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogContent, DialogFooter } from './ui/dialog';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

const EventFormDialog = dynamic(() => import('./event-form-dialog').then(mod => mod.EventFormDialog));
const EventDetailsDialog = dynamic(() => import('./event-details-dialog').then(mod => mod.EventDetailsDialog));
const AppointmentImportDialog = dynamic(() => import('./appointment-import-dialog').then(mod => mod.AppointmentImportDialog));

interface WeeklyCalendarProps {
  branch: 'Matriz' | 'Valle';
  initialDate: Date | null;
  onEventUpdate: () => void;
  onDateChange: (date: Date) => void;
}

const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM
const PIXELS_PER_MINUTE = 64 / 60;

interface PositionedEvent extends Event {
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

const processOverlappingEvents = (eventsForDay: Event[]): PositionedEvent[] => {
    if (!eventsForDay || eventsForDay.length === 0) return [];

    const sortedEvents = [...eventsForDay].sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || b.endDate.getTime() - a.endDate.getTime());
    
    let collisionGroups: Event[][] = [];
    sortedEvents.forEach(event => {
        let placed = false;
        for (let group of collisionGroups) {
            if (group.some(e => event.startDate < e.endDate && event.endDate > e.startDate)) {
                group.push(event);
                placed = true;
                break;
            }
        }
        if (!placed) {
            collisionGroups.push([event]);
        }
    });

    let positionedEvents: PositionedEvent[] = [];

    collisionGroups.forEach(group => {
        group.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        
        let columns: Event[][] = [];
        group.forEach(event => {
            let colIndex = 0;
            while(columns[colIndex] && columns[colIndex].some(e => event.startDate < e.endDate && event.endDate > e.startDate)) {
                colIndex++;
            }
            if (!columns[colIndex]) {
                columns[colIndex] = [];
            }
            columns[colIndex].push(event);
            (event as any).column = colIndex;
        });

        const numColumns = columns.length;
        group.forEach(event => {
            const startHour = getHours(event.startDate);
            const startMinute = getMinutes(event.startDate);
            const top = ((startHour - 6) * 60 + startMinute) * PIXELS_PER_MINUTE;
            const durationInMinutes = Math.max(differenceInMinutes(event.endDate, event.startDate), 10);
            const height = durationInMinutes * PIXELS_PER_MINUTE;

            positionedEvents.push({
                ...event,
                top,
                height,
                left: ((event as any).column / numColumns) * 100,
                width: (1 / numColumns) * 100,
                zIndex: event.status === 'cancelled' ? 1 : ((event as any).column + 2),
            });
        });
    });

    return positionedEvents;
};

interface RescheduleInfo {
  event: PositionedEvent;
  newStartDate: Date;
  newEndDate: Date;
}

const MonthSelector = ({
  currentDate,
  onDateSelect,
}: {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}) => {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(year, i, 1);
    return {
      name: format(monthDate, 'MMM', { locale: es }),
      date: monthDate,
    };
  });

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md">
      <div className="flex w-max space-x-2 p-1">
        {months.map(month => (
          <Popover key={month.name}>
            <PopoverTrigger asChild>
              <Button
                variant={isSameMonth(currentDate, month.date) ? 'default' : 'outline'}
                size="sm"
                className="capitalize"
              >
                {month.name}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                month={month.date}
                onSelect={(day) => day && onDateSelect(day)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export function WeeklyCalendar({ branch, initialDate, onEventUpdate, onDateChange }: WeeklyCalendarProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  
  const [selectedDateForForm, setSelectedDateForForm] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<PositionedEvent | null>(null);
  const [rescheduleInfo, setRescheduleInfo] = useState<RescheduleInfo | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [blinkingEventId, setBlinkingEventId] = useState<string | null>(null);

  const [now, setNow] = useState(new Date());

  const [resizingEvent, setResizingEvent] = useState<{ id: string, initialHeight: number, initialY: number, startDate: Date, isImported: boolean } | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<{ id: string, event: PositionedEvent, element: HTMLElement, offsetY: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ top: number, left: number, height: number, width: number, date: Date } | null>(null);
  const [previewTime, setPreviewTime] = useState<Date | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const calendarContentRef = useRef<HTMLDivElement>(null);
  const autoScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = user?.role === 'administrador';
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), (snap) => {
      setAllClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);

  const weekStart = startOfWeek(currentDate || new Date(), { locale: es, weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate || new Date(), { locale: es, weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeIndicatorPosition = useMemo(() => {
    const todayIndex = days.findIndex(day => isSameDay(now, day));
    if (todayIndex === -1) return null;

    const startHour = 6;
    const minutesSinceStart = differenceInMinutes(now, setHours(startOfDay(now), startHour));
    const top = minutesSinceStart * PIXELS_PER_MINUTE;
    
    if (top < 0 || top > hours.length * 64) return null;

    return {
      top,
      left: (todayIndex / 7) * 100,
      width: 100 / 7
    };
  }, [now, days]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const term = searchQuery.trim().toLowerCase();
      if (term.length >= 2) {
        setIsSearching(true);
        try {
            const matchedClients = allClients.filter(c => {
                const fullName = `${c.name || ''} ${c.lastName || ''}`.toLowerCase();
                const idNum = (c.idNumber || '').toLowerCase();
                return fullName.includes(term) || idNum.includes(term);
            });
            
            const matchedClientIds = matchedClients.map(c => c.id);
            const resultsMap = new Map<string, Event>();

            if (matchedClientIds.length > 0) {
                const eventsRef = collection(db, 'events');
                const chunks = [];
                for (let i = 0; i < matchedClientIds.length; i += 30) {
                    chunks.push(matchedClientIds.slice(i, i + 30));
                }

                for (const chunk of chunks) {
                    const q = query(
                        eventsRef, 
                        where('clientId', 'in', chunk),
                        where('branch', '==', branch)
                    );
                    const snap = await getDocs(q);
                    snap.forEach(docSnap => {
                        const data = docSnap.data();
                        resultsMap.set(docSnap.id, {
                            ...data,
                            id: docSnap.id,
                            startDate: (data.startDate as Timestamp).toDate(),
                            endDate: (data.endDate as Timestamp).toDate()
                        } as Event);
                    });
                }
            }

            if (resultsMap.size < 50) {
                const qDirect = query(
                    collection(db, 'events'), 
                    where('branch', '==', branch),
                    limit(500)
                );
                const directSnap = await getDocs(qDirect);
                directSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    const clientName = (data.clientName || '').toLowerCase();
                    if (clientName.includes(term)) {
                        if (!resultsMap.has(docSnap.id)) {
                            resultsMap.set(docSnap.id, {
                                ...data,
                                id: docSnap.id,
                                startDate: (data.startDate as Timestamp).toDate(),
                                endDate: (data.endDate as Timestamp).toDate()
                            } as Event);
                        }
                    }
                });
            }

            const foundEvents = Array.from(resultsMap.values());
            foundEvents.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
            setSearchResults(foundEvents);
        } catch (error) {
            console.error("Error en búsqueda:", error);
        } finally {
            setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery, branch, allClients]);

  useEffect(() => {
    if (!currentDate) return;
    onDateChange(currentDate);
    const viewStart = startOfDay(startOfWeek(currentDate, { locale: es, weekStartsOn: 1 }));
    const viewEnd = endOfWeek(currentDate, { locale: es, weekStartsOn: 1 });

    const qEvents = query(
      collection(db, 'events'),
      where('branch', '==', branch),
      where('startDate', '>=', Timestamp.fromDate(viewStart)),
      where('startDate', '<=', Timestamp.fromDate(viewEnd))
    );
    const unsubEvents = onSnapshot(qEvents, (querySnapshot) => {
      const eventsData: Event[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.startDate || !data.endDate) return;
        eventsData.push({
          ...data,
          id: doc.id,
          startDate: (data.startDate as Timestamp).toDate(),
          endDate: (data.endDate as Timestamp).toDate(),
          status: data.status || 'confirmed',
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined
        } as Event);
      });
      setEvents(eventsData);
    });

    return () => unsubEvents();
  }, [currentDate, branch, onDateChange]);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>, event: PositionedEvent) => {
    if (!isAdmin || event.status === 'cancelled') return;
    e.stopPropagation();
    setResizingEvent({
      id: event.id,
      initialHeight: event.height,
      initialY: e.clientY,
      startDate: event.startDate,
      isImported: event.isImported || false,
    });
  }, [isAdmin]);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>, event: PositionedEvent) => {
    if (!isAdmin || event.status === 'cancelled' || !gridRef.current) return;
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;

    const eventRect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - eventRect.top;

    setDraggingEvent({
      id: event.id,
      event: event,
      element: e.currentTarget,
      offsetY: offsetY,
    });

    e.currentTarget.style.opacity = '0.5';
  }, [isAdmin]);

  const changeWeek = useCallback((amount: number) => {
    setCurrentDate(current => addDays(current || new Date(), amount * 7));
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (autoScrollTimeout.current) {
        clearTimeout(autoScrollTimeout.current);
        autoScrollTimeout.current = null;
    }

    if (resizingEvent && gridRef.current) {
        e.preventDefault();
        const dy = e.clientY - resizingEvent.initialY;
        const newHeight = Math.max(10 * PIXELS_PER_MINUTE, resizingEvent.initialHeight + dy);

        const eventElement = gridRef.current.querySelector(`[data-event-id="${resizingEvent.id}"]`) as HTMLDivElement;
        if (eventElement) {
            eventElement.style.height = `${newHeight}px`;
            const newDurationInMinutes = Math.round(newHeight / PIXELS_PER_MINUTE);
            const newEndDate = roundToNearestMinutes(addMinutes(resizingEvent.startDate, newDurationInMinutes), { nearestTo: 5 });
            setPreviewTime(newEndDate);
        }
    } else if (draggingEvent && gridRef.current && calendarContentRef.current) {
        e.preventDefault();
        const gridRect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - gridRect.left;
        const dayWidth = gridRect.width / 7;
        const dayIndex = Math.max(0, Math.min(6, Math.floor(x / dayWidth)));
        const newDate = days[dayIndex];
        const columnLeft = dayIndex * dayWidth;

        const rawTop = e.clientY - gridRect.top + calendarContentRef.current.scrollTop - draggingEvent.offsetY;
        const snappedMinutes = Math.round((rawTop / PIXELS_PER_MINUTE) / 5) * 5;
        const newTop = snappedMinutes * PIXELS_PER_MINUTE;
        const newStartDate = addMinutes(setHours(startOfDay(newDate), 6), snappedMinutes);
        
        setDragPreview({
            top: newTop,
            left: columnLeft,
            height: draggingEvent.event.height,
            width: dayWidth,
            date: newStartDate,
        });
    }
  }, [resizingEvent, draggingEvent, days]);

  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    if (resizingEvent && user) {
        setPreviewTime(null);
        const eventToResize = events.find(ev => ev.id === resizingEvent.id);
        const eventElement = gridRef.current?.querySelector(`[data-event-id="${resizingEvent.id}"]`) as HTMLDivElement | null;
        if (eventToResize && eventElement) {
            const newHeight = parseFloat(eventElement.style.height);
            const newEndDate = roundToNearestMinutes(addMinutes(resizingEvent.startDate, Math.round(newHeight / PIXELS_PER_MINUTE)), { nearestTo: 5 });
            setRescheduleInfo({ event: eventToResize as PositionedEvent, newStartDate: eventToResize.startDate, newEndDate });
            setIsRescheduleDialogOpen(true);
        }
        setResizingEvent(null);
    } else if (draggingEvent && user && dragPreview) {
        const originalEvent = draggingEvent.event;
        const duration = differenceInMinutes(originalEvent.endDate, originalEvent.startDate);
        setRescheduleInfo({ event: originalEvent, newStartDate: dragPreview.date, newEndDate: addMinutes(dragPreview.date, duration) });
        setIsRescheduleDialogOpen(true);
        draggingEvent.element.style.opacity = '1';
        setDraggingEvent(null);
        setDragPreview(null);
    } else if (draggingEvent) {
      draggingEvent.element.style.opacity = '1';
      setDraggingEvent(null);
      setDragPreview(null);
    }
  }, [resizingEvent, draggingEvent, dragPreview, user, events]);

  useEffect(() => {
    if (resizingEvent || draggingEvent) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingEvent, draggingEvent, handleMouseMove, handleMouseUp]);

  const handleConfirmReschedule = async ({ reason, lateMinutes }: { reason: string, lateMinutes: number }) => {
    if (!rescheduleInfo || !user) return;
    const { event, newStartDate, newEndDate } = rescheduleInfo;

    try {
        await runTransaction(db, async (transaction) => {
            const originalEventRef = doc(db, 'events', event.id);
            const newEventRef = doc(collection(db, 'events'));
            
            const newEventData = {
                ...event,
                startDate: Timestamp.fromDate(newStartDate),
                endDate: Timestamp.fromDate(newEndDate),
                status: 'confirmed',
                createdAt: Timestamp.now(),
                lateMinutes: lateMinutes || 0,
                clientName_lowercase: (event.clientName || '').toLowerCase(),
            };
            delete (newEventData as any).id;
            delete (newEventData as any).top;
            delete (newEventData as any).height;
            delete (newEventData as any).left;
            delete (newEventData as any).width;
            delete (newEventData as any).zIndex;
            
            transaction.set(newEventRef, newEventData);
            const rescheduledText = `--- REAGENDADA por ${user.name} para ${format(newStartDate, "d MMM, HH:mm", { locale: es })}. Motivo: ${reason} ---`;
            transaction.update(originalEventRef, { status: 'cancelled', description: `${event.description || ''}\n${rescheduledText}`.trim() });

            const logRefNew = doc(collection(db, 'activity_log'));
            transaction.set(logRefNew, { userId: user.id, userName: user.name, action: `Creó nueva cita (reagendada) para ${event.clientName}.`, timestamp: Timestamp.now(), eventId: newEventRef.id, clientId: event.clientId });
            const logRefCancelled = doc(collection(db, 'activity_log'));
            transaction.set(logRefCancelled, { userId: user.id, userName: user.name, action: `Reagendó cita de ${event.clientName}.`, timestamp: Timestamp.now(), eventId: event.id, clientId: event.clientId });
        });
        toast({ title: 'Cita Reagendada' });
        onEventUpdate();
    } catch (error) {
        toast({ title: 'Error', variant: 'destructive' });
    } finally {
        setIsRescheduleDialogOpen(false);
        setRescheduleInfo(null);
    }
  };

  const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>, day: Date, hour: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isBottomHalf = (e.clientY - rect.top) > rect.height / 2;
    setSelectedDateForForm(setMinutes(setHours(day, hour), isBottomHalf ? 30 : 0));
    setIsFormOpen(true);
  };

  const handleEventClick = (event: PositionedEvent) => {
    if (blinkingEventId === event.id) {
      setBlinkingEventId(null);
    }
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  }
  
  const handleSearchResultClick = (event: Event) => {
    setCurrentDate(event.startDate);
    onDateChange(event.startDate);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchDropdownOpen(false);
    setBlinkingEventId(event.id);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) setCurrentDate(date);
    setIsDatePickerOpen(false);
  }

  const getEventsForDay = useMemo(() => {
    return (day: Date): PositionedEvent[] => {
      const eventsForDay = events.filter(event => isSameDay(event.startDate, day));
      return processOverlappingEvents(eventsForDay);
    };
  }, [events]);

  const handleExportICS = () => {
    const icsEvents = events.map(event => ({
        title: event.clientName,
        start: [event.startDate.getFullYear(), event.startDate.getMonth() + 1, event.startDate.getDate(), event.startDate.getHours(), event.startDate.getMinutes()] as ics.DateArray,
        end: [event.endDate.getFullYear(), event.endDate.getMonth() + 1, event.endDate.getDate(), event.endDate.getHours(), event.endDate.getMinutes()] as ics.DateArray,
        description: `${event.description || ''}\nServicios: ${event.serviceNames.join(', ')}`,
        location: event.branch,
        status: event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
        uid: event.id,
    } as ics.EventAttributes));

    const { error, value } = ics.createEvents(icsEvents);
    if (value) saveAs(new Blob([value], { type: 'text/calendar' }), `citas_${branch}.ics`);
  };

  const SearchDropdown = () => {
    if (!searchQuery || searchQuery.length < 2) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
        {isSearching ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
        ) : searchResults.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron resultados.</div>
        ) : (
          <div className="flex flex-col">
            {searchResults.map(event => (
              <div 
                key={event.id} 
                onClick={() => handleSearchResultClick(event)}
                className="flex flex-col p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b last:border-0"
              >
                <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">{event.clientName}</div>
                <div className="text-xs text-slate-500 flex justify-between mt-0.5">
                  <span>{format(event.startDate, "d MMM, HH:mm", { locale: es })}</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{event.branch}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!currentDate) return <div className="min-h-screen w-full flex items-center justify-center"><p>Cargando calendario...</p></div>;

  return (
    <>
      <TooltipProvider>
        <Card className="flex flex-col h-[calc(100vh-120px)] border-0 shadow-none bg-white dark:bg-slate-950">
           <header className="flex flex-col md:flex-row items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 gap-4 shrink-0">
             <div className="flex items-center gap-4">
                 <Button variant="outline" className="rounded-full px-5 font-medium border-slate-300 hover:bg-slate-50" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                 <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => changeWeek(-1)}><ChevronLeft className="h-5 w-5" /></Button>
                     <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => changeWeek(1)}><ChevronRight className="h-5 w-5" /></Button>
                 </div>
                 <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                     <PopoverTrigger asChild>
                        <Button variant="ghost" className="text-xl font-normal hover:bg-transparent hover:text-primary p-0 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            {format(currentDate, 'MMMM \'de\' yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
                        </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={currentDate} onSelect={handleDateSelect} initialFocus locale={es} weekStartsOn={1} /></PopoverContent>
                 </Popover>
             </div>

             <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
                 <div className="relative w-full max-w-[280px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Buscar paciente..."
                        className="pl-9 h-9 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchDropdownOpen(true)}
                    />
                    {searchQuery.length > 0 && <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-slate-600" onClick={() => {setSearchQuery(''); setIsSearchDropdownOpen(false);}}><X className="h-4 w-4" /></Button>}
                    {isSearchDropdownOpen && <SearchDropdown />}
                 </div>
                 
                 <div className="hidden md:flex items-center gap-1">
                   <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:bg-slate-100"><Settings className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent>Ajustes</TooltipContent></Tooltip>
                 </div>

                 {isAdmin && (
                 <div className="flex items-center gap-2 ml-1">
                     <Button size="sm" onClick={() => setIsImportOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 font-medium"><Upload className="mr-2 h-3.5 w-3.5" />Importar</Button>
                 </div>
                 )}
             </div>
           </header>

            <div ref={calendarContentRef} className="flex-grow overflow-auto relative bg-white dark:bg-slate-950">
              <div className="grid grid-cols-[60px_1fr] relative min-h-full">
                <div className="sticky top-0 left-0 z-30 row-start-1 col-start-1 bg-white dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800 flex items-end justify-center pb-2">
                  <span className="text-[10px] font-medium text-slate-400">GMT-05</span>
                </div>
                <div className="sticky top-0 z-30 col-start-2 grid grid-cols-7 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  {days.map((day) => {
                    const isTodayFlag = isToday(day);
                    return (
                      <div key={day.toString()} className="text-center py-2 border-r border-slate-200 dark:border-slate-800 relative group flex flex-col items-center justify-center min-h-[60px]">
                        <p className={cn("text-[11px] font-medium uppercase tracking-wider mb-1", isTodayFlag ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}>{format(day, 'eee', { locale: es })}</p>
                        <p className={cn("text-2xl w-10 h-10 flex items-center justify-center rounded-full transition-colors", isTodayFlag ? "bg-blue-600 text-white font-normal shadow-sm" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer")} onClick={() => { setSelectedDateForForm(day); setIsFormOpen(true); }}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="row-start-2 pt-2 pr-2 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  {hours.map(hour => <div key={hour} className="h-[64px] text-right -translate-y-[10px]"><span className="text-[11px] font-medium text-slate-400 pr-1">{format(setHours(new Date(), hour), 'h a')}</span></div>)}
                </div>
                <div className="row-start-2 col-start-2 relative grid grid-cols-7 bg-white dark:bg-slate-950" ref={gridRef}>
                  {days.map((day) => {
                    const dayPositionedEvents = getEventsForDay(day);
                    return (
                      <div key={day.toString()} className="day-column border-r border-slate-200 dark:border-slate-800 relative">
                        {hours.map(hour => <div key={hour} className="h-[64px] border-b border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-blue-50/50 transition-colors" onClick={(e) => handleSlotClick(e, day, hour)} />)}
                        {dayPositionedEvents.map(event => {
                          const isCancelled = event.status === 'cancelled';
                          const isBlinking = blinkingEventId === event.id;
                          let style: React.CSSProperties = { top: `${event.top}px`, height: `${event.height}px`, left: `${event.left}%`, width: `calc(${event.width}% - 1px)`, zIndex: isBlinking ? 60 : event.zIndex };
                          if (isCancelled) {
                              style.backgroundColor = hexToRgba(event.color, 0.03);
                              style.backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent 6px, ${hexToRgba(event.color, 0.1)} 6px, ${hexToRgba(event.color, 0.1)} 12px)`;
                              style.borderLeft = `4px solid ${event.color}`;
                              style.borderRight = `1px solid ${hexToRgba(event.color, 0.2)}`;
                              style.borderTop = `1px solid ${hexToRgba(event.color, 0.2)}`;
                              style.borderBottom = `1px solid ${hexToRgba(event.color, 0.2)}`;
                              style.color = '#64748b';
                          } else if (event.isImported && !event.colorModified) {
                              style.backgroundColor = hexToRgba(event.color, 0.2);
                              style.borderColor = event.color;
                              style.borderWidth = '1px';
                              style.borderStyle = 'solid';
                              style.color = '#000000';
                          } else {
                              style.backgroundColor = event.color;
                              style.border = '1px solid white';
                              style.color = '#ffffff';
                          }
                          return (
                            <Tooltip key={event.id}>
                              <TooltipTrigger asChild>
                                <div data-event-id={event.id} onMouseDown={(e) => handleDragStart(e, event)} className={cn("rounded p-1 pl-1.5 absolute overflow-hidden flex flex-col text-left transition-all", !isCancelled && 'cursor-pointer hover:brightness-95 shadow-sm', isCancelled && 'opacity-90 grayscale-[0.5]', isBlinking && 'animate-blink ring-2 ring-blue-500 ring-offset-1', (!isCancelled && !(event.isImported && !event.colorModified)) && 'font-medium')} style={style} onClick={(e) => { if (!isCancelled) { e.stopPropagation(); handleEventClick(event); } }}>
                                  <div className="flex-grow overflow-hidden leading-tight">
                                    <p className={cn("text-[11px] font-semibold truncate leading-tight tracking-tight", isCancelled && "line-through opacity-70")}>{event.clientName}</p>
                                    <p className={cn("text-[10px] truncate leading-tight mt-0.5", isCancelled ? "opacity-70 line-through" : "opacity-90")}>
                                      {format(event.startDate, 'h:mm a')}
                                    </p>
                                  </div>
                                  {!isCancelled && <div data-resize-handle="true" className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center group" onMouseDown={(e) => handleResizeStart(e, event)}><GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="p-1 text-sm max-w-xs">
                                  <p className="font-bold">{event.clientName}</p>
                                  <p className="text-muted-foreground">{format(event.startDate, 'h:mm a')} - {format(event.endDate, 'h:mm a')}</p>
                                  {isCancelled && event.description && (
                                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                      <p className="text-xs text-red-500 font-semibold mb-0.5">Motivo del cambio:</p>
                                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-tight">{event.description}</p>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    )
                  })}
                  {timeIndicatorPosition && <div className="absolute w-full h-[2px] bg-red-500 z-40 pointer-events-none" style={{ top: `${timeIndicatorPosition.top}px`, left: `${timeIndicatorPosition.left}%`, width: `${timeIndicatorPosition.width}%` }}><div className="absolute -left-1.5 -top-[5px] w-3 h-3 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div></div>}
                  {dragPreview && <div className="absolute rounded p-1 bg-blue-500/50 border-2 border-blue-600 border-dashed z-50 pointer-events-none" style={{ top: dragPreview.top, left: dragPreview.left, height: dragPreview.height, width: dragPreview.width }}><p className="text-white font-bold text-xs truncate uppercase">{draggingEvent?.event.clientName}</p></div>}
                </div>
              </div>
            </div>
        </Card>
      </TooltipProvider>

      <Suspense fallback={null}>
        {isFormOpen && <EventFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} selectedDate={selectedDateForForm} onEventUpdate={onEventUpdate} branch={branch} />}
        {isDetailsOpen && selectedEvent && <EventDetailsDialog isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen} event={selectedEvent} onEventUpdate={onEventUpdate} />}
        {isImportOpen && <AppointmentImportDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} branch={branch} onImportSuccess={onEventUpdate} />}
        <RescheduleDialog isOpen={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen} rescheduleInfo={rescheduleInfo} onConfirm={handleConfirmReschedule} />
      </Suspense>
    </>
  );
}
