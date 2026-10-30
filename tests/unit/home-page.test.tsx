import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));
const { default: HomePage } = await import("@/app/page");
const { faq } = await import("@/content/landing");

// Chapter 17 turned the home page into a landing page: the hero keeps its heading
// and calls to action, and "Find a mentor" now also closes the page.
describe("HomePage (landing page)", () => {
  it("shows the main heading and both calls to action in the hero", () => {
    render(<HomePage />);
    const hero = screen.getByRole("region", { name: /learn faster/i });
    expect(within(hero).getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: "Find a mentor" })).toHaveAttribute("href", "/mentors");
    expect(within(hero).getByRole("link", { name: "Become a mentor" })).toHaveAttribute("href", "/sign-up");
  });

  it("has one h1 and a section heading for each part of the page", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "How it works",
      "Why learners choose TutorNest",
      "Pricing",
      "Questions",
      "Your first session can be this week.",
    ]);
  });

  it("answers every question in a native disclosure", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelectorAll("details")).toHaveLength(faq.length);
    for (const item of faq) expect(screen.getByText(item.question).tagName).toBe("SUMMARY");
  });

  it("publishes structured data that cannot close its script tag", () => {
    const { container } = render(<HomePage />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    expect(JSON.parse(script.innerHTML)).toMatchObject({ "@type": "Organization", name: "TutorNest by Northlight Learning" });
    expect(script.innerHTML).not.toContain("<");
  });
});
