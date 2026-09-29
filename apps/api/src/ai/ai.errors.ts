/** Stable, machine-readable failure codes any AI-backed feature can map to its own HTTP response. */
export type AiErrorCode =
  | 'not_configured'
  | 'invalid_request'
  | 'rate_limited'
  | 'busy'
  | 'daily_limit'
  | 'refused'
  | 'truncated'
  | 'invalid_output'
  | 'upstream_auth'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'cancelled'
  | 'save_failed'
  | 'internal';

/**
 * Thrown by {@link AiProviderService} for every failure. Generic across
 * features (blog generation today, anything else tomorrow) so callers can
 * pattern-match on `code` without knowing which provider/model was used.
 */
export class AiProviderError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
