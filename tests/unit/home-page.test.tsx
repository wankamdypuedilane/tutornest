import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("shows the main heading and both calls to action", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /learn faster/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a mentor" })).toHaveAttribute(
      "href",
      "/mentors",
    );
    expect(screen.getByRole("link", { name: "Become a mentor" })).toBeInTheDocument();
  });
});
