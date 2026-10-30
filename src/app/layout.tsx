import type { Metadata } from "next";
// Self-hosted fonts: served from our own domain, no request to Google.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TutorNest",
    template: "%s · TutorNest",
  },
  description:
    "Find a mentor, book a session, and grow your skills with Northlight Learning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
