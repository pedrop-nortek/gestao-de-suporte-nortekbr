import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(totalMinutes: number): string {
  // Handle edge cases
  if (totalMinutes <= 0) return "0m";
  if (totalMinutes < 1) return "< 1m";
  
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

export function formatAverageResolutionTime(avgMinutes: number): string {
  if (avgMinutes <= 0) return "N/A";
  
  // For very small durations, show in minutes
  if (avgMinutes < 60) {
    return `${Math.round(avgMinutes)}m`;
  }
  
  // For medium durations, show in hours and minutes
  if (avgMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.round(avgMinutes % 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  
  // For long durations, show in days and hours
  const days = Math.floor(avgMinutes / 1440);
  const remainingMinutes = avgMinutes % 1440;
  const hours = Math.round(remainingMinutes / 60);
  
  if (hours > 0) {
    return `${days}d ${hours}h`;
  } else {
    return `${days}d`;
  }
}