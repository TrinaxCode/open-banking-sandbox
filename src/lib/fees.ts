/**
 * Fee policy for the sandbox.
 *
 * The only fee today is the flat charge for sending money to an account that
 * belongs to someone else; moving money between your own accounts (including a
 * scheduled transfer to your own savings) is always free. Fees are posted as
 * their own `fee` transaction so every ledger row equals one money movement.
 */

/** Default flat fee for an outgoing external transfer: $1.00. */
export const DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS = 100;

function configuredFeeCents(): number {
  const raw = process.env.EXTERNAL_TRANSFER_FEE_CENTS;
  if (!raw) return DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS;
}

/**
 * Fee charged for a transfer, in cents. Read from the environment on each call
 * so tests and local runs can change the policy without a rebuild.
 */
export function computeTransferFeeCents(params: { sameUser: boolean }): number {
  return params.sameUser ? 0 : configuredFeeCents();
}

/** The fee the UI should advertise for outgoing transfers, in cents. */
export function externalTransferFeeCents(): number {
  return configuredFeeCents();
}
