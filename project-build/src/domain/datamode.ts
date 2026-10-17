// Where the return's inputs come from. Vault mode (production): RETURN_ID, BLOB_READ_WRITE_TOKEN and
// DATA_ENCRYPTION_KEY are all set, and the packet and AI payload are read encrypted from the private Blob store.
// File mode (local dev, tests): none of the three is set; data/packet.json and ai/eval/ai-suggestions.json on disk.
// Some but not all set is a misconfiguration and fails closed, naming the missing variables (never a value).
type Env = Record<string, string | undefined>;

export const VAULT_VARS = ['RETURN_ID', 'BLOB_READ_WRITE_TOKEN', 'DATA_ENCRYPTION_KEY'] as const;

export class PartialVaultConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`Partial vault configuration: ${missing.join(', ')} not set. Set all of ${VAULT_VARS.join(', ')}, or none.`);
    this.name = 'PartialVaultConfigError';
  }
}

export function isVaultMode(env: Env = process.env): boolean {
  const missing = VAULT_VARS.filter((k) => !env[k]);
  if (missing.length === 0) return true;
  if (missing.length === VAULT_VARS.length) return false;
  throw new PartialVaultConfigError(missing);
}
