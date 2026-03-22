
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
  orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { Event } from '@/lib/types';
import { format, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NOTIFICATION_WINDOW_MINUTES = 60; // Notify for appointments in the next 60 minutes

export function AppointmentNotifier() {
  /*
  const { user } = useAuth();
  const { toast } = useToast();
  const [upcomingEvent, setUpcomingEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const checkAppointments = () => {
      const now = new Date();
      const notificationThreshold = new Date(now.getTime() + NOTIFICATION_WINDOW_MINUTES * 60 * 1000);

      // Simplified query to avoid composite index requirement.
      // We fetch all upcoming events and filter client-side.
      const q = query(
        collection(db, 'events'),
        orderBy('startDate', 'asc'),
        where('startDate', '>=', Timestamp.fromDate(now))
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let nextEvent: Event | null = null;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const eventStartDate = (data.startDate as Timestamp).toDate();

          // Client-side filtering
          if (data.status === 'confirmed' && isAfter(eventStartDate, now) && isBefore(eventStartDate, notificationThreshold)) {
            // Check if current user has already been notified
            if (data.notifiedUsers && data.notifiedUsers.includes(user.id)) {
              return;
            }

            const event = {
              id: doc.id,
              ...data,
              startDate: eventStartDate,
              endDate: (data.endDate as Timestamp).toDate(),
            } as Event;

            // Find the soonest event that hasn't been shown yet
            if (!nextEvent || event.startDate < nextEvent.startDate) {
              nextEvent = event;
            }
          }
        });

        if (nextEvent) {
          setUpcomingEvent(nextEvent);
        }
      });
      
      return unsubscribe;
    };

    const unsubscribe = checkAppointments();
    const intervalId = setInterval(checkAppointments, 60 * 1000); // Check every minute

    return () => {
        if (unsubscribe) unsubscribe();
        clearInterval(intervalId);
    };

  }, [user]);

  const handleAcknowledge = useCallback(async () => {
    if (!upcomingEvent || !user) return;

    try {
      const eventDocRef = doc(db, 'events', upcomingEvent.id);
      await updateDoc(eventDocRef, {
        notifiedUsers: arrayUnion(user.id)
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo marcar la notificación como leída.",
        variant: "destructive"
      });
    } finally {
      setUpcomingEvent(null);
    }
  }, [upcomingEvent, user, toast]);

  if (!upcomingEvent) {
    return null;
  }

  const minutesUntil = differenceInMinutes(upcomingEvent.startDate, new Date());
  const timeString = format(upcomingEvent.startDate, "HH:mm 'hrs'", { locale: es });

  return (
    <AlertDialog open={!!upcomingEvent} onOpenChange={() => setUpcomingEvent(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
            <div className="flex justify-center mb-4">
                <div className="p-4 bg-primary/10 rounded-full">
                    <BellRing className="w-8 h-8 text-primary" />
                </div>
            </div>
          <AlertDialogTitle className="text-center text-2xl">Recordatorio de Cita</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base pt-2">
            La cita para <strong>{upcomingEvent.clientName}</strong> en la sucursal <strong>{upcomingEvent.branch}</strong> está programada para las <strong>{timeString}</strong> (en {minutesUntil > 0 ? `${minutesUntil} minutos` : 'este momento'}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={handleAcknowledge}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  */
 return null;
}
