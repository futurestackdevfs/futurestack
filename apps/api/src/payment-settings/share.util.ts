export function computeTrainerShare(
  gross: number,
  trainerSharePct: number,
): { trainerShare: number; platformCut: number } {
  const trainerShare = Math.round((gross * trainerSharePct) / 100);
  return { trainerShare, platformCut: gross - trainerShare };
}

/**
 * A trainer's effective share % = their own override, falling back to the
 * global PaymentSettings default, finally a hard 50% floor.
 *
 * The admin-configured value means "what the trainer keeps" — the platform
 * gets `100 - trainerShare`%.
 */
export function resolveTrainerSharePercent(
  override: number | null | undefined,
  globalDefault: number | null | undefined,
): number {
  if (override === null || override === undefined) {
    return globalDefault === null || globalDefault === undefined
      ? 50
      : globalDefault;
  }
  return override;
}
