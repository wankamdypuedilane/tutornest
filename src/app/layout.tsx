import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
// Self-hosted fonts: served from our own domain, no request to Google.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  // Makes relative URLs in metadata (canonical, Open Graph image) absolute.
  metadataBase: new URL(siteUrl),
  openGraph: { type: "website", siteName: "TutorNest", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
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
        {/* Privacy-friendly audience statistics (no cookies); active on Vercel only. */}
        <Analytics />
      </body>
    </html>
  );
}
