
"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
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
      <SiteHeader onAddNewClick={handleOpenForm} />

      <main className="px-4 xl:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between my-4 gap-4">
          <h1
            className={cn(
              "text-xl md:text-2xl font-bold p-2 rounded-lg transition-colors duration-300",
              selectedBranch === "Matriz"
                ? "bg-matriz-background text-header-foreground"
                : "bg-valle-background text-header-foreground"
            )}
          >
            Calendario: {selectedBranch}
          </h1>

          <div className="flex items-center gap-2">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[120px]">
                  {getViewName()}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setView('day')}>Día</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setView('week')}>Semana</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setView('month')}>Mes</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={selectedBranch === "Matriz" ? "default" : "ghost"}
                onClick={() => setSelectedBranch("Matriz")}
                className="gap-2 px-2 md:px-3 h-9"
              >
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Matriz</span>
              </Button>

              <Button
                variant={selectedBranch === "Valle" ? "default" : "ghost"}
                onClick={() => setSelectedBranch("Valle")}
                className="gap-2 px-2 md:px-3 h-9"
              >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Valle</span>
              </Button>
            </div>
          </div>
        </div>

        {renderCalendarView()}
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
