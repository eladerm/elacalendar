
"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  addDays,
  startOfDay,
  format,
  isToday,
  setHours,
  getMinutes,
  differenceInMinutes,
  setMinutes,
  addMinutes,
  roundToNearestMinutes,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getHours,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Upload, GripVertical, Search, Download, Trash2, Plus, CalendarDays, Smile, User as UserIcon, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import type { Event } from '@/lib/types';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  addDoc,
  updateDoc,
  runTransaction,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { RescheduleDialog } from './reschedule-dialog';
import { Badge } from './ui/badge';
import * as ics from 'ics';
import { saveAs } from 'file-saver';
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogContent, DialogFooter } from './ui/dialog';
import { hexToRgba } from '@/lib/utils';

const EventFormDialog = dynamic(() => import('./event-form-dialog').then(mod => mod.EventFormDialog));
const EventDetailsDialog = dynamic(() => import('./event-details-dialog').then(mod => mod.EventDetailsDialog));
const AppointmentImportDialog = dynamic(() => import('./appointment-import-dialog').then(mod => mod.AppointmentImportDialog));

interface DailyCalendarProps {
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

    const activeEvents = eventsForDay.filter(e => e.status !== 'cancelled');
    const cancelledEvents = eventsForDay.filter(e => e.status === 'cancelled');

    const sortedEvents = [...activeEvents].sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || b.endDate.getTime() - a.endDate.getTime());
    
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
                zIndex: (event as any).column + 2,
            });
        });
    });

    const positionedCancelledEvents: PositionedEvent[] = cancelledEvents.map(event => {
        const startHour = getHours(event.startDate);
        const startMinute = getMinutes(event.startDate);
        const top = ((startHour - 6) * 60 + startMinute) * PIXELS_PER_MINUTE;
        const durationInMinutes = Math.max(differenceInMinutes(event.endDate, event.startDate), 10);
        const height = durationInMinutes * PIXELS_PER_MINUTE;

        return {
            ...event,
            top,
            height,
            left: 0,
            width: 100,
            zIndex: 1,
        };
    });

    return [...positionedEvents, ...positionedCancelledEvents];
};

interface RescheduleInfo {
  event: PositionedEvent;
  newStartDate: Date;
  newEndDate: Date;
}

export function DailyCalendar({ branch, initialDate, onEventUpdate, onDateChange }: DailyCalendarProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [selectedDateForForm, setSelectedDateForForm] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<PositionedEvent | null>(null);
  
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [descriptionToShow, setDescriptionToShow] = useState('');
  
  const [now, setNow] = useState(new Date());

  const calendarContentRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'administrador';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    if (!currentDate) return;
    onDateChange(currentDate);
    const viewStart = startOfDay(currentDate);
    const viewEnd = addDays(viewStart, 1);

    const qEvents = query(
      collection(db, 'events'),
      where('branch', '==', branch),
      where('startDate', '>=', Timestamp.fromDate(viewStart)),
      where('startDate', '<', Timestamp.fromDate(viewEnd))
    );
    const unsubEvents = onSnapshot(qEvents, (querySnapshot) => {
      const eventsData: Event[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: (data.startDate as Timestamp).toDate(),
          endDate: (data.endDate as Timestamp).toDate(),
          status: data.status || 'confirmed',
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined
        } as Event;
      });
      setEvents(eventsData);
    });

    return () => unsubEvents();
  }, [currentDate, branch, onDateChange]);

  const changeDay = (amount: number) => {
    setCurrentDate(current => addDays(current || new Date(), amount));
  };
  
  const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>, day: Date, hour: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const isBottomHalf = clickY > rect.height / 2;

    let newDate = setHours(day, hour);
    newDate = isBottomHalf ? setMinutes(newDate, 30) : setMinutes(newDate, 0);

    setSelectedDateForForm(newDate);
    setIsFormOpen(true);
  };
  
  const handleEventClick = (event: PositionedEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
    }
    setIsDatePickerOpen(false);
  }

  const positionedEvents = useMemo(() => {
    return processOverlappingEvents(events);
  }, [events]);

  const handleAddNewClick = () => {
    setSelectedDateForForm(currentDate || new Date());
    setIsFormOpen(true);
  };
  
  const handleShowDescription = (description: string) => {
    setDescriptionToShow(description);
    setIsDescriptionDialogOpen(true);
  };
  
  const timeIndicatorPosition = useMemo(() => {
    if (!currentDate || !isSameDay(now, currentDate)) return null;

    const startHour = 6;
    const minutesSinceStart = differenceInMinutes(now, setHours(startOfDay(now), startHour));
    const top = minutesSinceStart * PIXELS_PER_MINUTE;
    
    if (top < 0) return null;

    return { top };
  }, [now, currentDate]);

  if (!currentDate) {
    return <div className="min-h-screen w-full flex items-center justify-center"><p>Cargando calendario...</p></div>;
  }

  const day = currentDate;

  return (
    <>
      <TooltipProvider>
        <Card className="flex flex-col h-[calc(100vh-180px)]">
           <header className="flex flex-col p-4 border-b gap-4">
             <div className="flex items-center gap-2">
                 <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                     <PopoverTrigger asChild>
                     <Button variant={"ghost"} className={cn("text-lg font-semibold capitalize hover:bg-accent focus:ring-2 focus:ring-ring flex items-center gap-2")}>
                         <CalendarDays className="w-5 h-5 text-muted-foreground" />
                         <h2 className="font-semibold text-lg capitalize">{currentDate ? format(currentDate, 'eeee, d MMM yyyy', { locale: es }) : 'Cargando...'}</h2>
                     </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start">
                     <Calendar mode="single" selected={currentDate} onSelect={handleDateSelect} initialFocus locale={es} />
                     </PopoverContent>
                 </Popover>
 
                 <div className="flex items-center gap-2 ml-auto">
                     <Button variant="outline" size="icon" onClick={() => changeDay(-1)}>
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                     <Button variant="outline" size="icon" onClick={() => changeDay(1)}>
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                 </div>
             </div>
           </header>
            <div ref={calendarContentRef} className="flex-grow overflow-auto">
              <div className="grid grid-cols-[56px_1fr] relative">
                <div className="row-start-2 pt-2 pr-2">
                  {hours.map(hour => (
                    <div key={hour} className="h-16 text-right -translate-y-2.5">
                      <span className="text-xs text-muted-foreground">{format(setHours(new Date(), hour), 'HH:00')}</span>
                    </div>
                  ))}
                </div>

                <div className="row-start-1 row-span-2 col-start-2 relative grid grid-cols-1">
                    <div className="day-column relative">
                      {hours.map(hour => (
                        <div key={hour} className="h-16 border-b border-border/30 cursor-pointer hover:bg-accent/50" onClick={(e) => handleSlotClick(e, day, hour)} />
                      ))}
                      {positionedEvents.map(event => {
                          const isCancelled = event.status === 'cancelled';
                          
                          let style: React.CSSProperties = { top: `${event.top}px`, height: `${event.height}px`, left: `${event.left}%`, width: `calc(${event.width}% - 4px)`, zIndex: event.zIndex };
                          
                          if (isCancelled) {
                             // Style is handled by is-cancelled class
                          } else if (event.isImported && !event.colorModified) {
                            style.backgroundColor = hexToRgba(event.color, 0.2);
                            style.borderColor = event.color;
                            style.borderWidth = '1px';
                            style.borderStyle = 'solid';
                          } else {
                            style.backgroundColor = event.color;
                            style.border = '1px solid white';
                          }
                          
                          return (
                            <Tooltip key={event.id}>
                              <TooltipTrigger asChild>
                                <div
                                  data-event-id={event.id}
                                  className={cn("rounded-md p-1 pl-2 absolute overflow-hidden flex flex-col text-left", !isCancelled && 'cursor-pointer', isCancelled && 'is-cancelled', (event.isImported && !event.colorModified) ? 'text-black' : 'text-white')}
                                  style={style}
                                  onClick={(e) => { if (!isCancelled) {e.stopPropagation(); handleEventClick(event); }}}
                                >
                                  <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold text-xs truncate uppercase">{event.clientName}</p>
                                    <div className={cn("flex items-center gap-1 truncate text-xs", (event.isImported && !event.colorModified) ? 'opacity-70' : 'opacity-90')}>
                                      <span>{format(event.startDate, 'h:mm a')} - {format(event.endDate, 'h:mm a')}</span>
                                      {event.appointmentType === 'nueva' && <Smile className="w-3 h-3 shrink-0" />}
                                      {event.appointmentType === 'mantenimiento' && <UserIcon className="w-3 h-3 shrink-0" />}
                                    </div>
                                    {event.serviceNames && event.serviceNames.length > 0 && <p className={cn("text-xs truncate", (event.isImported && !event.colorModified) ? 'opacity-60' : 'opacity-80')}>{event.serviceNames.join(', ')}</p>}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="p-1 text-sm max-w-xs">
                                  <p className="font-bold">{event.clientName}</p>
                                  <p className="text-muted-foreground">{format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}</p>
                                  {event.description && <div className="mt-2 text-xs italic max-h-24 overflow-y-auto cursor-pointer hover:underline" onClick={() => handleShowDescription(event.description)} dangerouslySetInnerHTML={{ __html: event.description.replace(/\\n/g, '<br />').replace(/\n/g, '<br />') }} />}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                    </div>

                  {timeIndicatorPosition && (
                    <div className="absolute w-full h-0.5 bg-black z-10 pointer-events-none" style={{ top: `${timeIndicatorPosition.top}px` }}>
                      <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-black"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </Card>
      </TooltipProvider>

      <Suspense fallback={<div>Cargando...</div>}>
        {isFormOpen && <EventFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} selectedDate={selectedDateForForm} onEventUpdate={onEventUpdate} branch={branch} />}
        {isDetailsOpen && selectedEvent && <EventDetailsDialog isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen} event={selectedEvent} onEventUpdate={onEventUpdate} />}
      </Suspense>

      <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Descripción Completa</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-y-auto p-1"><div className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: descriptionToShow.replace(/\\n/g, '<br />').replace(/\n/g, '<br />') }} /></div>
          <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cerrar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
