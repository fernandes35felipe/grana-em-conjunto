import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateFilter = ({ dateRange, onDateRangeChange }: DateFilterProps) => {
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
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Força a data a ser interpretada no fuso horário local
    const newDate = new Date(e.target.value + "T00:00:00");
    if (!isNaN(newDate.getTime())) {
      onDateRangeChange({ from: newDate, to: dateRange.to });
      setSelectedPreset("custom");
    }
  };
  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Força a data a ser interpretada no fuso horário local
    const newDate = new Date(e.target.value + "T00:00:00");
    if (!isNaN(newDate.getTime())) {
      onDateRangeChange({ from: dateRange.from, to: newDate });
      setSelectedPreset("custom");
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-full sm:w-auto">
        <Label htmlFor="preset" className="mb-2 block">
          Período
        </Label>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger id="preset" className="w-full sm:w-[180px]">
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
      </div>

      <div className="w-full sm:w-auto">
        <Label htmlFor="date-from" className="mb-2 block">
          Data Início
        </Label>
        <Input
          id="date-from"
          type="date"
          value={format(dateRange.from, "yyyy-MM-dd")}
          onChange={handleFromDateChange}
          className="w-full sm:w-[160px]"
        />
      </div>

      <div className="w-full sm:w-auto">
        <Label htmlFor="date-to" className="mb-2 block">
          Data Fim
        </Label>

        <Input
          id="date-to"
          type="date"
          value={format(dateRange.to, "yyyy-MM-dd")}
          onChange={handleToDateChange}
          className="w-full sm:w-[160px]"
        />
      </div>

      {selectedPreset === "custom" && (
        <Button variant="outline" size="sm" onClick={() => handlePresetChange("current-month")} className="w-full sm:w-auto">
          Resetar
        </Button>
      )}
    </div>
  );
};
