import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Parses a page-size query param and clamps it to a sane range so a client
 * can't request `?limit=100000000` and force an unbounded DB read / response.
 *
 *   @Query('limit', new PageSizePipe(20)) limit: number   // default 20, max 100
 *   @Query('perPage', new PageSizePipe(20, 200)) pp: number
 */
@Injectable()
export class PageSizePipe implements PipeTransform {
  constructor(
    private readonly fallback = 20,
    private readonly max = 100,
  ) {}

  transform(value: unknown): number {
    const n = parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n) || n < 1) return this.fallback;
    return Math.min(n, this.max);
  }
}

/** Function form for services / places a pipe can't reach. */
export function clampPageSize(value: unknown, fallback = 20, max = 100): number {
  const n = parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}
