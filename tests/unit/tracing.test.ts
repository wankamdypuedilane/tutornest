// @vitest-environment node
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { beforeEach, describe, expect, it } from "vitest";

// Spans are collected in memory instead of being sent to a tracing service.
const exporter = new InMemorySpanExporter();
trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
const { withSpan } = await import("@/lib/tracing");

beforeEach(() => exporter.reset());

describe("withSpan", () => {
  it("returns the work's result and records a finished span with its attributes", async () => {
    expect(await withSpan("cron.deliver_emails", { batch: 20 }, async () => 7)).toBe(7);
    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe("cron.deliver_emails");
    expect(span?.attributes).toEqual({ batch: 20 });
    expect(span?.status.code).not.toBe(SpanStatusCode.ERROR);
  });

  it("marks the span as failed, records the exception and rethrows", async () => {
    await expect(withSpan("cron.queue_reminders", {}, async () => Promise.reject(new Error("timeout")))).rejects.toThrow("timeout");
    const [span] = exporter.getFinishedSpans();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.events.map((e) => e.name)).toEqual(["exception"]);
  });
});
