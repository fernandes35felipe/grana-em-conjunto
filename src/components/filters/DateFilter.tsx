// Em src/components/filters/DateFilter.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateFilter = ({ dateRange, onDateRangeChange }: DateFilterProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("current-month");

  const presets = [
    {
      label: "Este mês",
      value: "current-month",
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: "Mês passado",
      value: "last-month",
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
    {
      label: "Próximo mês",
      value: "next-month",
      getRange: () => {
        const nextMonth = addMonths(new Date(), 1);
        return {
          from: startOfMonth(nextMonth),
          to: endOfMonth(nextMonth),
        };
      },
    },
    {
      label: "Este ano",
      value: "current-year",
      getRange: () => ({
        from: startOfYear(new Date()),
        to: endOfYear(new Date()),
      }),
    },
    {
      label: "Personalizado",
      value: "custom",
      getRange: () => dateRange,
    },
  ];

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value !== "custom") {
      const preset = presets.find((p) => p.value === value);
      if (preset) {
        onDateRangeChange(preset.getRange());
      }
    }
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.from || !range.to) return "Selecione o período";

    if (format(range.from, "yyyy-MM", { locale: ptBR }) === format(range.to, "yyyy-MM", { locale: ptBR })) {
      return format(range.from, "MMMM 'de' yyyy", { locale: ptBR });
    }

    return `${format(range.from, "dd/MM/yy", { locale: ptBR })} - ${format(range.to, "dd/MM/yy", { locale: ptBR })}`;
  };

  return (
    <div className="flex gap-2">
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-[240px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 date-filter-popover"
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={10}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                setSelectedPreset("custom");
                setCalendarOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
