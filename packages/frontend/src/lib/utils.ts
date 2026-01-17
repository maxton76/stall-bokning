import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// Re-export toDate from shared package for consistency
export { toDate } from "@stall-bokning/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
