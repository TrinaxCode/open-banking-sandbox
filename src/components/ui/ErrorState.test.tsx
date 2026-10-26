import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorState } from "./ErrorState";
import NotFound from "@/app/not-found";
import GlobalError from "@/app/global-error";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("ErrorState", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders error alert with retry button and triggers reset callback", () => {
    const reset = vi.fn();
    const error = new Error("Something broke");

    renderWithLocale(<ErrorState error={error} reset={reset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button");
    fireEvent.click(retryBtn);

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders opaque digest reference when present without leaking raw error", () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("Database syntax error at line 42"), {
      digest: "NEXT_DIGEST_12345",
    });

    renderWithLocale(<ErrorState error={error} reset={reset} />);

    expect(screen.getByText(/NEXT_DIGEST_12345/)).toBeInTheDocument();
    expect(screen.queryByText(/syntax error/)).not.toBeInTheDocument();
  });
});

describe("NotFound", () => {
  it("renders 404 message and dashboard return link", () => {
    renderWithLocale(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});

describe("GlobalError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders standalone fallback HTML and executes retry", () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("Fatal crash"), {
      digest: "FATAL_ERR_99",
    });

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/FATAL_ERR_99/)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
