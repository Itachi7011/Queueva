import { addDays, addWeeks, addMonths } from "date-fns";
import type { RecurrenceFrequency } from "@prisma/client";

const MAX_OCCURRENCES = 52; // hard cap, e.g. ~1 year of weekly sessions

export function expandRecurrence(
  firstStart: Date,
  frequency: RecurrenceFrequency,
  recurrenceEndDate: Date | null
): Date[] {
  if (frequency === "NONE" || !recurrenceEndDate) return [firstStart];

  const step = (d: Date): Date => {
    switch (frequency) {
      case "DAILY":
        return addDays(d, 1);
      case "WEEKLY":
        return addWeeks(d, 1);
      case "BIWEEKLY":
        return addWeeks(d, 2);
      case "MONTHLY":
        return addMonths(d, 1);
      default:
        return d;
    }
  };

  const occurrences: Date[] = [firstStart];
  let current = firstStart;

  while (occurrences.length < MAX_OCCURRENCES) {
    current = step(current);
    if (current > recurrenceEndDate) break;
    occurrences.push(current);
  }

  return occurrences;
}
