
"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Building, Store, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

const WeeklyCalendarNoSSR = dynamic(
  () => import("@/components/weekly-calendar").then((m) => m.WeeklyCalendar),
  { ssr: false }
);

const DailyCalendarNoSSR = dynamic(
  () => import("@/components/daily-calendar").then((m) => m.DailyCalendar),
  { ssr: false }
);

const MonthlyCalendarNoSSR = dynamic(
  () => import("@/components/monthly-calendar").then((m) => m.MonthlyCalendar),
  { ssr: false }
);

const EventFormDialog = dynamic(
  () => import("@/components/event-form-dialog").then((m) => m.EventFormDialog),
  { ssr: false }
);


type Branch = "Matriz" | "Valle";
type View = "day" | "week" | "month";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventsNeedUpdate, setEventsNeedUpdate] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch>("Matriz");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [view, setView] = useState<View>("week");

  useEffect(() => {
    if (isMobile) {
      setView('day');
    }
  }, [isMobile]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && user.branch) {
      setSelectedBranch(user.branch);
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    if (selectedBranch === "Matriz") {
      document.body.classList.add("theme-matriz");
      document.body.classList.remove("theme-valle");
    } else {
      document.body.classList.add("theme-valle");
      document.body.classList.remove("theme-matriz");
    }
  }, [selectedBranch]);

  const handleEventUpdate = useCallback(() => {
    setEventsNeedUpdate((prev) => !prev);
  },[]);

  const handleOpenForm = (date?: Date) => {
    setCurrentDate(date || new Date());
    setIsFormOpen(true);
  };

  const renderCalendarView = () => {
    if (!currentDate) {
      return (
        <div className="flex h-96 w-full items-center justify-center">
          <p>Cargando fecha...</p>
        </div>
      );
    }
    const key = `${view}-${selectedBranch}-${eventsNeedUpdate.toString()}`;
    switch(view) {
      case 'day':
        return <DailyCalendarNoSSR
          key={key}
          branch={selectedBranch}
          initialDate={currentDate}
          onDateChange={setCurrentDate}
          onEventUpdate={handleEventUpdate}
        />
      case 'month':
        return <MonthlyCalendarNoSSR
          key={key}
          branch={selectedBranch}
          initialDate={currentDate}
          onDateChange={setCurrentDate}
          onEventUpdate={handleEventUpdate}
          onAddEvent={handleOpenForm}
        />
      case 'week':
      default:
        return <WeeklyCalendarNoSSR
          key={key}
          branch={selectedBranch}
          initialDate={currentDate}
          onDateChange={setCurrentDate}
          onEventUpdate={handleEventUpdate}
        />
    }
  }
  
  const getViewName = () => {
    switch(view) {
      case 'day': return 'Día';
      case 'week': return 'Semana';
      case 'month': return 'Mes';
      default: return 'Semana';
    }
  }


  if (loading || !user || !currentDate) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      

      <main className="px-2 xl:px-4 flex-1 flex flex-col h-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-2 mb-2 gap-2 shrink-0">
          <h1
            className={cn(
              "text-lg md:text-xl font-bold p-1.5 px-3 rounded-lg transition-colors duration-300",
              selectedBranch === "Matriz"
                ? "bg-matriz-background text-header-foreground"
                : "bg-valle-background text-header-foreground"
            )}
          >
            Sucursal: {selectedBranch}
          </h1>

          <div className="flex items-center gap-3">
            {/* Selector de Vista Estilo Google Calendar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10 px-4 min-w-[110px] justify-between font-medium bg-background hover:bg-muted/50 border-border">
                  {getViewName()}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] p-2">
                <DropdownMenuItem onClick={() => setView('day')} className="justify-between rounded-md cursor-pointer py-2">
                  Día <span className="text-muted-foreground text-xs font-mono font-medium">D</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('week')} className="justify-between rounded-md cursor-pointer py-2">
                  Semana <span className="text-muted-foreground text-xs font-mono font-medium">W</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('month')} className="justify-between rounded-md cursor-pointer py-2">
                  Mes <span className="text-muted-foreground text-xs font-mono font-medium">M</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg shadow-sm border border-border h-10">
              <Button
                variant={selectedBranch === "Matriz" ? "default" : "ghost"}
                onClick={() => setSelectedBranch("Matriz")}
                className="gap-2 px-2 md:px-3 h-full text-xs font-semibold"
              >
                <Building className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Matriz</span>
              </Button>

              <Button
                variant={selectedBranch === "Valle" ? "default" : "ghost"}
                onClick={() => setSelectedBranch("Valle")}
                className="gap-2 px-2 md:px-3 h-full text-xs font-semibold"
              >
                <Store className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Valle</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
            {renderCalendarView()}
        </div>
      </main>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-full">
            <p>Cargando...</p>
          </div>
        }
      >
        {isFormOpen && (
          <EventFormDialog
            isOpen={isFormOpen}
            onOpenChange={setIsFormOpen}
            selectedDate={currentDate || new Date()}
            onEventUpdate={handleEventUpdate}
            branch={selectedBranch}
          />
        )}
      </Suspense>
    </div>
  );
}
