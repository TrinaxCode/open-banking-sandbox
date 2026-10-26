import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { createRecurringTransfer } from "@/lib/actions";
import type { AccountForUi } from "@/types/ui";
import { ScheduledClient } from "./ScheduledClient";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/actions", () => ({
  createRecurringTransfer: vi.fn(),
  toggleRecurringTransfer: vi.fn(),
  deleteRecurringTransfer: vi.fn(),
}));

const account: AccountForUi = {
  id: "checking",
  userId: "user",
  type: "checking",
  number: "CHK-001001",
  nickname: "Everyday",
  balance: 5000,
  creditLimit: null,
  interestRate: null,
  dueDate: null,
  lastInterestAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderForm(fee = 100, locale: "en" | "es" = "en") {
  render(
    <LocaleProvider initialLocale={locale}>
      <ScheduledClient transfers={[]} accounts={[account]} externalFeeCents={fee} />
    </LocaleProvider>,
  );
}

async function submitForm() {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("From account"), account.id);
  await user.type(screen.getByLabelText("To account number"), "CHK-AB12CD");
  await user.type(screen.getByLabelText("Amount"), "25");
  await user.click(screen.getByRole("button", { name: "Create schedule" }));
}

describe("scheduled transfer form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets the form and refreshes the list after asynchronous creation", async () => {
    vi.mocked(createRecurringTransfer).mockResolvedValue({ success: true });
    renderForm();

    await submitForm();

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(createRecurringTransfer).toHaveBeenCalledOnce();
    const data = vi.mocked(createRecurringTransfer).mock.calls[0]![1];
    expect(data.get("fromAccountId")).toBe(account.id);
    expect(data.get("targetAccountNumber")).toBe("CHK-AB12CD");
    expect(data.get("amount")).toBe("25");
    expect(screen.getByLabelText("Amount")).toHaveValue(null);
    expect(screen.getByLabelText("To account number")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create schedule" })).toBeEnabled();
  });

  it("preserves the inputs and allows retrying after a rejected creation", async () => {
    vi.mocked(createRecurringTransfer).mockResolvedValue({
      error: "Invalid destination",
    });
    renderForm();

    await submitForm();

    expect(await screen.findByText("Invalid destination")).toBeVisible();
    expect(screen.getByLabelText("Amount")).toHaveValue(25);
    expect(screen.getByLabelText("To account number")).toHaveValue("CHK-AB12CD");
    expect(screen.getByRole("button", { name: "Create schedule" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each(["en", "es"] as const)("discloses the configured fee in %s", (locale) => {
    renderForm(250, locale);

    const note = screen.getByText(locale === "en" ? /fee applies/ : /comisión/);
    expect(note.textContent).toContain(locale === "en" ? "$2.50" : "2,50");
  });

  it("does not advertise a fee when it is waived", () => {
    renderForm(0);
    expect(screen.queryByText(/fee applies/)).not.toBeInTheDocument();
  });
});
