import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/sessions/actions", () => ({ bookSession: vi.fn(), cancelBooking: vi.fn() }));
vi.mock("@livekit/components-styles", () => ({}));
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ token, children }: { token: string; children: React.ReactNode }) => (
    <div data-testid="room" data-token={token}>
      {children}
    </div>
  ),
  VideoConference: () => <p>Video conference</p>,
}));

const { SlotPicker } = await import("@/components/booking/slot-picker");
const { SessionRoom } = await import("@/components/booking/session-room");

const props = {
  mentorId: "3f0c6a51-8d2e-4b7a-9c41-2e5d8f1a7b90",
  mentorName: "Marc",
  mentorTimeZone: "Europe/Paris",
  rules: [{ weekday: 2, start: "18:00", end: "19:00" }],
  busy: [],
  now: "2026-11-16T09:00:00.000Z",
  signedIn: true,
  signInHref: "/sign-in?next=%2Fmentors%2Fmarc%2Fbook",
};

beforeEach(() => vi.clearAllMocks());

describe("SlotPicker", () => {
  it("shows a Paris evening slot at the London time, grouped by the London day", () => {
    render(<SlotPicker {...props} viewerTimeZone="Europe/London" />);
    const tuesday = screen.getByRole("group", { name: "Tuesday 17 November" });
    expect(within(tuesday).getByRole("radio", { name: "17:00–18:00" })).toBeInTheDocument();
    expect(screen.getByText(/shown in your time zone \(Europe\/London\)/)).toBeInTheDocument();
  });

  it("offers half-hour sessions too", async () => {
    const user = userEvent.setup();
    render(<SlotPicker {...props} viewerTimeZone="Europe/Paris" />);
    await user.click(screen.getByRole("radio", { name: "30 minutes" }));
    const tuesday = screen.getByRole("group", { name: "Tuesday 17 November" });
    expect(within(tuesday).getAllByRole("radio").map((r) => r.parentElement?.textContent)).toEqual(["18:00–18:30", "18:30–19:00"]);
  });

  it("books the chosen instant and reports a conflict", async () => {
    const onBook = vi.fn().mockResolvedValue({ ok: false, message: "This time was booked by someone else a moment ago." });
    const user = userEvent.setup();
    render(<SlotPicker {...props} viewerTimeZone="America/New_York" onBook={onBook} />);
    await user.click(screen.getAllByRole("radio", { name: "12:00–13:00" })[0]!);
    await user.click(screen.getByRole("button", { name: "Book this session" }));
    expect(onBook).toHaveBeenCalledWith({ mentorId: props.mentorId, startsAt: "2026-11-17T17:00:00.000Z", minutes: 60 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("booked by someone else"));
  });

  it("asks visitors to sign in and brings them back", () => {
    render(<SlotPicker {...props} signedIn={false} viewerTimeZone="Europe/Paris" />);
    expect(screen.getByRole("link", { name: "Sign in to book" })).toHaveAttribute("href", props.signInHref);
  });
});

describe("SessionRoom", () => {
  it("shows the server's explanation when the room is not open yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "The room opens 10 minutes before the session." }), { status: 403 })));
    const user = userEvent.setup();
    render(<SessionRoom bookingId="booking-1" />);
    await user.click(screen.getByRole("button", { name: "Join the session" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("The room opens 10 minutes before"));
    expect(fetch).toHaveBeenCalledWith("/api/sessions/booking-1/token", { method: "POST" });
  });

  it("connects with the token returned by the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ token: "jwt-token", serverUrl: "wss://x.livekit.cloud" })));
    const user = userEvent.setup();
    render(<SessionRoom bookingId="booking-1" />);
    await user.click(screen.getByRole("button", { name: "Join the session" }));
    expect(await screen.findByTestId("room")).toHaveAttribute("data-token", "jwt-token");
  });
});
