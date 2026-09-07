/** Parse JWT-style duration strings (`15m`, `7d`, `3600s`) into seconds. */
export function parseJwtExpiresToSeconds(value: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return fallbackSeconds;
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  return amount * (multipliers[unit] ?? 1);
}
