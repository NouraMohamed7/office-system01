import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * دالة لدمج كلاسات Tailwind مع بعض بدون تعارض
 * مثال: cn("p-4", condition && "bg-red-500", "p-2") 
 * هتاخد آخر كلاس متعارض (p-2) وتشيل اللي قبله (p-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}