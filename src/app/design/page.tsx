import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const colourTokens = [
  { name: "primary", className: "bg-primary text-primary-foreground" },
  { name: "secondary", className: "bg-secondary text-secondary-foreground" },
  { name: "accent", className: "bg-accent text-accent-foreground" },
  { name: "muted", className: "bg-muted text-muted-foreground" },
  { name: "success", className: "bg-success text-success-foreground" },
  { name: "warning", className: "bg-warning text-warning-foreground" },
  { name: "destructive", className: "bg-destructive text-white dark:bg-destructive/60" },
];

// Internal page that shows every token and core component in one place.
// Review it in light and dark mode whenever the design system changes.
export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-12 px-6 py-12">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold">Design system</h1>
        <Logo />
      </section>

      <section aria-labelledby="colours" className="space-y-4">
        <h2 id="colours" className="text-xl font-semibold">Colour tokens</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colourTokens.map((token) => (
            <li key={token.name} className={`rounded-lg p-4 text-sm font-medium ${token.className}`}>
              {token.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type" className="space-y-2">
        <h2 id="type" className="text-xl font-semibold">Typography</h2>
        <p className="font-display text-4xl font-semibold">Display: Fraunces</p>
        <p className="text-base">Body: Inter, 16px, comfortable line height for long reading.</p>
        <p className="text-sm text-muted-foreground">Secondary text uses the muted foreground token.</p>
      </section>

      <section aria-labelledby="components" className="space-y-4">
        <h2 id="components" className="text-xl font-semibold">Components</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Cancel booking</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Confirmed</Badge>
          <Badge variant="success">Completed</Badge>
          <Badge variant="warning">Starts soon</Badge>
          <Badge variant="outline">Draft</Badge>
        </div>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Book a session</CardTitle>
            <CardDescription>Forms use labelled inputs and visible focus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="goal">Your goal for this session</Label>
            <Input id="goal" placeholder="Prepare for a junior developer interview" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
