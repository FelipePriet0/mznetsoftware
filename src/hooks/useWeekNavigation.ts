import { useState } from "react";
import { addWeeks, startOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useWeekNavigation() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Segunda-feira
  );

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, -1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const formatWeekRange = () => {
    const endOfWeek = addWeeks(currentWeekStart, 1);
    return `${format(currentWeekStart, "dd/MM", { locale: ptBR })} - ${format(endOfWeek, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  return {
    currentWeekStart,
    goToNextWeek,
    goToPreviousWeek,
    goToCurrentWeek,
    formatWeekRange
  };
}