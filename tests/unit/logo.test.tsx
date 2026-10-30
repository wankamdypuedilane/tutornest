import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "@/components/brand/logo";

describe("Logo", () => {
  it("exposes a single accessible name, with or without the wordmark", () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByRole("img", { name: "TutorNest" })).toBeInTheDocument();

    rerender(<Logo withWordmark={false} />);
    expect(screen.getByRole("img", { name: "TutorNest" })).toBeInTheDocument();
    expect(screen.queryByText("TutorNest")).not.toBeInTheDocument();
  });
});
