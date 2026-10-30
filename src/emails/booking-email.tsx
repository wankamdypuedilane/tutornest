import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from "@react-email/components";
import { tz } from "@date-fns/tz";
import { format } from "date-fns";

export type BookingEmailKind = "booking_confirmed" | "booking_cancelled" | "session_reminder";

export type BookingEmailProps = {
  kind: BookingEmailKind;
  recipientName: string;
  otherName: string; // the other participant
  role: "learner" | "mentor"; // the recipient's role in this session
  start: string; // ISO instants
  end: string;
  timeZone: string; // the recipient's time zone
  sessionUrl: string;
  settingsUrl: string;
};

/** "Tuesday 17 November 2026, 18:00–19:00 (Europe/Paris)", in the recipient's zone. */
export function formatSessionTime({ start, end, timeZone }: Pick<BookingEmailProps, "start" | "end" | "timeZone">) {
  const zone = { in: tz(timeZone) };
  return `${format(start, "EEEE d MMMM yyyy, HH:mm", zone)}–${format(end, "HH:mm", zone)} (${timeZone})`;
}

const copy = {
  booking_confirmed: {
    subject: (p: BookingEmailProps) => `Session confirmed with ${p.otherName}`,
    intro: (p: BookingEmailProps) =>
      p.role === "learner" ? `Your session with ${p.otherName} is booked.` : `${p.otherName} booked a session with you.`,
    action: "See the session",
  },
  booking_cancelled: {
    subject: (p: BookingEmailProps) => `Session cancelled: ${p.otherName}`,
    intro: (p: BookingEmailProps) => `The session with ${p.otherName} has been cancelled. The time is free again.`,
    action: "Book another time",
  },
  session_reminder: {
    subject: (p: BookingEmailProps) => `Reminder: session with ${p.otherName} tomorrow`,
    intro: (p: BookingEmailProps) => `A reminder of your session with ${p.otherName}.`,
    action: "Open the session",
  },
} satisfies Record<BookingEmailKind, unknown>;

export const bookingEmailSubject = (props: BookingEmailProps) => copy[props.kind].subject(props);

// E-mail clients ignore external stylesheets and most modern CSS: React Email
// components produce table-based HTML with inline styles that they all accept.
export function BookingEmail(props: BookingEmailProps) {
  const content = copy[props.kind];
  const when = formatSessionTime(props);
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${content.intro(props)} ${when}`}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "Helvetica, Arial, sans-serif", color: "#14213d" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", maxWidth: "560px", borderRadius: "8px" }}>
          <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px" }}>
            {content.subject(props)}
          </Heading>
          <Text>Hello {props.recipientName},</Text>
          <Text>{content.intro(props)}</Text>
          <Text style={{ fontWeight: "bold" }}>{when}</Text>
          <Button
            href={props.sessionUrl}
            style={{ backgroundColor: "#1f6f78", color: "#ffffff", padding: "12px 20px", borderRadius: "6px" }}
          >
            {content.action}
          </Button>
          <Hr style={{ margin: "32px 0 16px" }} />
          <Text style={{ fontSize: "12px", color: "#5f6b7a" }}>
            You receive this e-mail because you use TutorNest.{" "}
            <Link href={props.settingsUrl}>Choose which e-mails you receive</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
