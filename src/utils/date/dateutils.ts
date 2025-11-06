export const formatDateForInput = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateTimeForInput = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const parseDateFromInput = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

export const parseDateTimeFromInput = (dateTimeString: string): Date => {
  const date = new Date(dateTimeString);
  return date;
};

export const formatDateForDatabase = (date: Date | string): string => {
  if (typeof date === "string") {
    if (date.includes("T")) {
      const d = new Date(date);
      return formatDateForInput(d);
    }
    return date;
  }
  return formatDateForInput(date);
};

export const formatDateTimeForDatabase = (dateTimeString: string): string => {
  if (!dateTimeString) return "";

  const parts = dateTimeString.split("T");
  if (parts.length !== 2) return dateTimeString;

  const [datePart, timePart] = parts;
  const [year, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");

  const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), 0, 0);

  return localDate.toISOString();
};

export const compareDates = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return d1.getTime() - d2.getTime();
};

export const isDateInPast = (date: Date | string): boolean => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getTime() < new Date().getTime();
};

export const addMinutesToDate = (date: Date | string, minutes: number): Date => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getTime() + minutes * 60000);
};
