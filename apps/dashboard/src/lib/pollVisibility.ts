/**
 * Apollo Client `skipPollAttempt` helper — pause polls in background tabs.
 */
export function skipPollWhenHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}
