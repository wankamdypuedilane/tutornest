"use client";

import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { formatTimeRange } from "@/lib/scheduling/slots";
import { useViewerTimeZone } from "@/lib/scheduling/use-viewer-time-zone";

/** "Tuesday 17 November, 17:00–18:00", in the viewer's time zone. */
export function SessionTime({ start, end }: { start: string; end: string }) {
  const zone = useViewerTimeZone();
  const range = { start: new Date(start), end: new Date(end) };
  if (!zone) return <time dateTime={start}>…</time>;
  return (
    <time dateTime={start}>
      {format(range.start, "EEEE d MMMM", { in: tz(zone) })}, {formatTimeRange(range, zone)}
    </time>
  );
}
