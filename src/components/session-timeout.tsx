
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_COUNTDOWN_SECONDS = 10;

export function SessionTimeout() {
  const { user, logout } = useAuth();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_SECONDS);

  const timeoutId = useRef<NodeJS.Timeout>();
  const countdownId = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    if (countdownId.current) clearInterval(countdownId.current);

    if (user) {
      timeoutId.current = setTimeout(() => {
        setIsWarningOpen(true);
        setCountdown(WARNING_COUNTDOWN_SECONDS);
      }, SESSION_TIMEOUT_MS);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
      
      const eventListener = () => resetTimer();

      events.forEach(event => window.addEventListener(event, eventListener));
      resetTimer(); // Initialize timer on login or page load

      return () => {
        events.forEach(event => window.removeEventListener(event, eventListener));
        if (timeoutId.current) clearTimeout(timeoutId.current);
        if (countdownId.current) clearInterval(countdownId.current);
      };
    }
  }, [user, resetTimer]);

  useEffect(() => {
    if (isWarningOpen) {
      countdownId.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownId.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownId.current) clearInterval(countdownId.current);
    };
  }, [isWarningOpen]);

  const handleLogout = () => {
    setIsWarningOpen(false);
    logout();
  };

  const handleStay = () => {
    setIsWarningOpen(false);
    resetTimer();
  };

  if (!user) {
    return null;
  }

  return (
    <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sigues ahí?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu sesión está a punto de cerrarse por inactividad.
            Serás desconectado en {countdown} segundos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión ahora
          </Button>
          <AlertDialogAction onClick={handleStay}>Continuar en sesión</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
