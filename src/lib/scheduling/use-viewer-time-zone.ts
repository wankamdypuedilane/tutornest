"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {}; // the time zone does not change while the page is open

/**
 * The viewer's IANA time zone, read from the browser. On the server there is no
 * viewer: the hook returns null there, and the client renders the real value
 * right after hydration, without a mismatch error.
 */
export function useViewerTimeZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}
