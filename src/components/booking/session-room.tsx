"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Connection = { token: string; serverUrl: string };

/** Asks our server for a token, then connects to LiveKit with the camera and microphone. */
export function SessionRoom({ bookingId }: { bookingId: string }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const join = () =>
    startTransition(async () => {
      setError("");
      const response = await fetch(`/api/sessions/${bookingId}/token`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as Partial<Connection> & { error?: string };
      if (!response.ok || !body.token || !body.serverUrl) {
        setError(body.error ?? "The session could not be opened. Please try again.");
        return;
      }
      setConnection({ token: body.token, serverUrl: body.serverUrl });
    });

  if (connection) {
    return (
      <LiveKitRoom
        token={connection.token}
        serverUrl={connection.serverUrl}
        connect
        video
        audio
        data-lk-theme="default"
        className="h-[70vh] overflow-hidden rounded-lg"
        onDisconnected={() => setConnection(null)}
        onError={(cause) => setError(cause.message)}
      >
        <VideoConference />
      </LiveKitRoom>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Your browser will ask for access to your camera and microphone. You can turn either off once inside.
      </p>
      <Button onClick={join} disabled={pending}>
        {pending ? "Opening…" : "Join the session"}
      </Button>
      <p role="status" className="text-sm text-destructive">
        {error}
      </p>
    </div>
  );
}
