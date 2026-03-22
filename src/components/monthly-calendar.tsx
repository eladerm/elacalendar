
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import type { Event } from '@/lib/types';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { EventDetailsDialog } from './event-details-dialog';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';

interface MonthlyCalendarProps {
  branch: 'Matriz' | 'Valle';
  initialDate: Date | null;
  onEventUpdate: () => void;
  onDateChange: (date: Date) => void;
  onAddEvent: (date: Date) => void;
}

interface PositionedEvent extends Event {
    top?: number;
    height?: number;
    left?: number;
    width?: number;
    zIndex?: number;
}

export function MonthlyCalendar({ branch, initialDate, onEventUpdate, onDateChange, onAddEvent }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialDate ? startOfMonth(initialDate) : new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PositionedEvent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const viewStart = startOfWeek(startOfMonth(currentMonth), { locale: es });
    const viewEnd = endOfWeek(endOfMonth(currentMonth), { locale: es });

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
          id: doc.id,
          ...data,
          startDate: (data.startDate as Timestamp).toDate(),
          endDate: (data.endDate as Timestamp).toDate(),
          status: data.status || 'confirmed',
        } as Event);
      });
      setEvents(eventsData);
    });

    return () => unsubEvents();
  }, [currentMonth, branch]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: es });
  const endDate = endOfWeek(monthEnd, { locale: es });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events
      .filter(event => {
        const eventDate = event.startDate;
        return eventDate.getFullYear() === day.getFullYear() &&
               eventDate.getMonth() === day.getMonth() &&
               eventDate.getDate() === day.getDate();
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  };
  
  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event as PositionedEvent);
    setIsDetailsOpen(true);
  };

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>Hoy</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t">
        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
          <div key={day} className="text-center py-2 text-sm font-medium text-muted-foreground border-r border-b">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={day.toString()}
              className={cn(
                "relative h-32 border-b border-r p-1 group cursor-pointer hover:bg-accent/50 transition-colors",
                !isSameMonth(day, currentMonth) && "bg-muted/30"
              )}
              onClick={() => onAddEvent(day)}
            >
              <div
                className={cn(
                  "absolute top-1 right-1 w-8 h-8 flex items-center justify-center rounded-full text-sm",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, 'd')}
              </div>
              <Button size="icon" variant="ghost" className="absolute bottom-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onAddEvent(day); }}>
                <Plus className="w-4 h-4 text-muted-foreground" />
              </Button>
              <div className="mt-8 space-y-0.5 overflow-y-auto max-h-[70px]">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className="p-1 rounded-md text-xs text-white truncate"
                    style={{ backgroundColor: event.color }}
                    onClick={(e) => handleEventClick(event, e)}
                  >
                    <span className="font-semibold">{format(event.startDate, 'HH:mm')}</span> {event.clientName}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                   <Popover>
                    <PopoverTrigger asChild>
                        <div className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={e => e.stopPropagation()}>
                            y {dayEvents.length - 2} más...
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-60">
                       <div className="space-y-2">
                         <h4 className="font-medium leading-none">{format(day, "eeee, d MMM", {locale: es})}</h4>
                         <div className="space-y-1">
                         {dayEvents.map(event => (
                            <div
                                key={event.id}
                                className="p-1 rounded-md text-xs text-white truncate"
                                style={{ backgroundColor: event.color }}
                                onClick={(e) => handleEventClick(event, e)}
                            >
                                <span className="font-semibold">{format(event.startDate, 'HH:mm')}</span> {event.clientName}
                            </div>
                         ))}
                         </div>
                       </div>
                    </PopoverContent>
                   </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
       {isDetailsOpen && selectedEvent && (
        <EventDetailsDialog
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          event={selectedEvent}
          onEventUpdate={onEventUpdate}
        />
      )}
    </>
  );
}

