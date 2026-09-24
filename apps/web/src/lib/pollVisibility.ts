/**
 * Apollo Client `skipPollAttempt` helper — pause polls in background tabs.
 * Floor ops already uses this pattern; keep call sites consistent.
 */
export function skipPollWhenHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}
