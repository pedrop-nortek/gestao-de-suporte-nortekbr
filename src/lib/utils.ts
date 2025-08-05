import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = Math.floor(totalMinutes % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h:${minutes.toString().padStart(2, '0')}m`;
  } else if (hours > 0) {
    return `${hours}h:${minutes.toString().padStart(2, '0')}m`;
  } else {
    return `${minutes}m`;
  }
}

export function formatDurationFromDays(totalDays: number): string {
  const totalMinutes = totalDays * 24 * 60;
  return formatDuration(totalMinutes);
}