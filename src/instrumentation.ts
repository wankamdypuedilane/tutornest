import { registerOTel } from "@vercel/otel";
import type { Instrumentation } from "next";
import { log } from "@/lib/log";

// Runs once per server instance, before any request. Next.js then records a
// trace for each request (rendering, fetches, Route Handlers), and our own
// spans (src/lib/tracing.ts) join it. Where traces go is configured by the
// platform (Vercel) or by OTEL_EXPORTER_OTLP_* environment variables.
export function register() {
  registerOTel({ serviceName: "tutornest" });
}

// Called by Next.js for every uncaught server error: rendering, Route Handlers,
// Server Actions and the proxy. Users see a generic message with a digest; the
// log line carries the same digest, so support can find the cause.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  log("error", error instanceof Error ? error.message : String(error), {
    digest: typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined,
    method: request.method,
    // The path only: query strings can carry tokens (password reset links, for example).
    path: request.path.split("?")[0],
    route: context.routePath,
    kind: context.routeType,
  });
};
