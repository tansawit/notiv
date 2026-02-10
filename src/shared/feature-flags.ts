function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export const ALLOW_LINEAR_PAT_FALLBACK = envFlagEnabled(import.meta.env.VITE_ALLOW_LINEAR_PAT_FALLBACK);
