import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("should render children", () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>,
    );
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("should apply default variant styles", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("glass-card");
  });

  it("should apply highlight variant styles", () => {
    render(
      <Card variant="highlight" data-testid="card">
        Content
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("glass-card");
    expect(card.className).toContain("border-primary-500/20");
  });

  it("should apply custom className", () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("custom-class");
  });

  it("should forward additional props", () => {
    render(<Card data-testid="test-card">Content</Card>);
    expect(screen.getByTestId("test-card")).toBeInTheDocument();
  });
});
