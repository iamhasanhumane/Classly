import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function formatDueDate(ms: number, tz = "Asia/Kolkata") {
  try {
    return formatInTimeZone(ms, tz, "EEE, d MMM yyyy · h:mm a zzz");
  } catch {
    return format(ms, "PPpp");
  }
}
