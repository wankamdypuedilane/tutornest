import type { Metadata } from "next";
// Self-hosted fonts: served from our own domain, no request to Google.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";

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
    // next-themes sets the `dark` class before React hydrates, hence the warning opt-out.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
