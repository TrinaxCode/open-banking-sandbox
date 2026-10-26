import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { addBeneficiary } from "@/lib/actions";
import { BeneficiariesClient } from "./BeneficiariesClient";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/actions", () => ({ addBeneficiary: vi.fn(), deleteBeneficiary: vi.fn() }));

describe("beneficiary creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([true, false])(
    "handles an asynchronous creation with success=%s",
    async (success) => {
      vi.mocked(addBeneficiary).mockResolvedValue(
        success ? { success: true } : { error: "Invalid destination" },
      );
      render(
        <LocaleProvider initialLocale="en">
          <BeneficiariesClient beneficiaries={[]} />
        </LocaleProvider>,
      );
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Name"), "Alice");
      await user.type(screen.getByLabelText("Account number"), "CHK-AB12CD");
      await user.click(screen.getByRole("button", { name: "Add beneficiary" }));

      await waitFor(() => {
        if (success) expect(refresh).toHaveBeenCalledOnce();
        else expect(screen.getByText("Invalid destination")).toBeVisible();
      });
      expect(screen.getByLabelText("Name")).toHaveValue(success ? "" : "Alice");
      expect(screen.getByLabelText("Account number")).toHaveValue(
        success ? "" : "CHK-AB12CD",
      );
      expect(screen.getByRole("button", { name: "Add beneficiary" })).toBeEnabled();
      expect(refresh).toHaveBeenCalledTimes(success ? 1 : 0);
    },
  );
});
