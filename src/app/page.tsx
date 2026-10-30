import type { Metadata } from "next";
import { TrackedLink } from "@/components/landing/tracked-link";
import { Button } from "@/components/ui/button";
import { facts, faq, features, hero, plans, steps } from "@/content/landing";
import { siteUrl } from "@/lib/site";

// The home page is static: it reads no request data, so Next.js prerenders it
// at build time and the CDN serves it instantly.
export const metadata: Metadata = {
  title: { absolute: "TutorNest — One-to-one mentoring for career changers in tech" },
  description:
    "Book one-to-one video sessions with experienced developers, in your own time zone. Free for learners during the Northlight pilot.",
  alternates: { canonical: "/" },
};

// Structured data for search engines. "<" is escaped so that no value can close the script tag.
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TutorNest by Northlight Learning",
  url: siteUrl,
  description: hero.lead,
}).replace(/</g, "\\u003c");

export default function HomePage() {
  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <section aria-labelledby="hero-title" className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-20 md:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">{hero.eyebrow}</p>
          <h1 id="hero-title" className="text-4xl font-semibold text-balance sm:text-5xl">
            {hero.title}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">{hero.lead}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <TrackedLink href="/mentors" event="cta_click" placement="hero">
                Find a mentor
              </TrackedLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <TrackedLink href="/sign-up" event="cta_click" placement="hero-mentor">
                Become a mentor
              </TrackedLink>
            </Button>
          </div>
        </div>
        {/* Decorative: an inline SVG costs no request and cannot delay the largest paint. */}
        <svg viewBox="0 0 320 240" aria-hidden="true" className="w-full text-primary">
          <rect x="10" y="20" width="190" height="130" rx="14" className="fill-primary/10 stroke-current" strokeWidth="3" />
          <rect x="120" y="90" width="190" height="130" rx="14" className="fill-background stroke-current" strokeWidth="3" />
          <circle cx="70" cy="75" r="22" className="fill-primary/40" />
          <circle cx="215" cy="145" r="22" className="fill-primary/70" />
          <path d="M170 182h90M170 200h60" className="stroke-current" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-y bg-muted/40">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-16">
          <h2 id="how-title" className="text-3xl font-semibold">How it works</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="space-y-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-title" className="mx-auto w-full max-w-5xl space-y-8 px-6 py-16">
        <h2 id="features-title" className="text-3xl font-semibold">Why learners choose TutorNest</h2>
        <ul className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.title} className="space-y-1 rounded-lg border p-5">
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.text}</p>
            </li>
          ))}
        </ul>
        <dl className="grid gap-6 rounded-lg bg-primary/5 p-6 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-sm text-muted-foreground">{fact.label}</dt>
              <dd className="text-2xl font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pricing-title" className="border-y bg-muted/40">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-16">
          <h2 id="pricing-title" className="text-3xl font-semibold">Pricing</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.name} aria-labelledby={`plan-${plan.name}`} className="space-y-4 rounded-lg border bg-background p-6">
                <h3 id={`plan-${plan.name}`} className="text-xl font-semibold">{plan.name}</h3>
                <p>
                  <span className="text-3xl font-semibold">{plan.price}</span>{" "}
                  <span className="text-muted-foreground">{plan.note}</span>
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Button asChild variant={plan.name === "Learners" ? "default" : "outline"}>
                  <TrackedLink href={plan.cta.href} event="cta_click" placement={`pricing-${plan.name.toLowerCase()}`}>
                    {plan.cta.label}
                  </TrackedLink>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl space-y-6 px-6 py-16">
        <h2 id="faq-title" className="text-3xl font-semibold">Questions</h2>
        {/* Native disclosure widgets: keyboard and screen reader support for free. */}
        {faq.map((item) => (
          <details key={item.question} className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">{item.question}</summary>
            <p className="mt-2 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </section>

      <section aria-labelledby="final-title" className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-14">
          <h2 id="final-title" className="text-2xl font-semibold">Your first session can be this week.</h2>
          <Button asChild size="lg" variant="secondary">
            <TrackedLink href="/mentors" event="cta_click" placement="footer">
              Find a mentor
            </TrackedLink>
          </Button>
        </div>
      </section>
    </main>
  );
}
