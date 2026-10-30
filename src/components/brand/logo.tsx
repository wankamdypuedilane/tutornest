import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Show the "TutorNest" wordmark next to the symbol. */
  withWordmark?: boolean;
};

// The TutorNest mark: two arcs forming a nest, with a dot for the learner.
// Colours come from design tokens, so the logo adapts to dark mode.
export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        role="img"
        aria-label="TutorNest"
      >
        <path
          d="M4 16c0 6.6 5.4 12 12 12s12-5.4 12-12"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M9 16c0 3.9 3.1 7 7 7s7-3.1 7-7"
          fill="none"
          stroke="var(--warning)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="16" cy="9" r="3.5" fill="var(--primary)" />
      </svg>
      {withWordmark && (
        <span aria-hidden="true" className="font-display text-xl font-semibold tracking-tight">
          TutorNest
        </span>
      )}
    </span>
  );
}
