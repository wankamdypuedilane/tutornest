"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import type { ComponentProps } from "react";

type TrackedLinkProps = ComponentProps<typeof Link> & { event: string; placement: string };

/**
 * A link that records a conversion event ("cta_click", placement "hero") when
 * clicked. Vercel Web Analytics stores no cookies; outside Vercel, track() does nothing.
 */
export function TrackedLink({ event, placement, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, { placement });
        onClick?.(e);
      }}
    />
  );
}
