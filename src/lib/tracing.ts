import { type Attributes, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("tutornest");

/**
 * Runs `work` inside a named span of the current request's trace, records
 * failures, and always ends the span. Without a configured exporter, the
 * OpenTelemetry API is a no-op: this costs almost nothing.
 */
export async function withSpan<T>(name: string, attributes: Attributes, work: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await work();
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
