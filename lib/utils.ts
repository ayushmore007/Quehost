import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes question input by stripping HTML tags and trimming extra whitespace.
 */
export function sanitizeQuestionText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";
  
  // Strip HTML tags using regex
  const stripped = rawText.replace(/<[^>]*>?/gm, "");
  
  // Normalize whitespace
  return stripped.trim().replace(/\s+/g, " ");
}

/**
 * Validates a standard UUID string.
 */
export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}
