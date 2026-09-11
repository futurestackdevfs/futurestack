/**
 * Fail-fast environment validation. Passed to `ConfigModule.forRoot({ validate })`
 * so the app refuses to boot with a broken/incomplete config instead of
 * degrading at runtime (JWTs signed with `undefined`, CORS falling back to
 * localhost in prod, payment routes 503-ing on every request, …).
 *
 * No schema library — a dependency isn't worth it for a flat list of strings.
 */
const ALWAYS_REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];

// Required only in production — dev has working defaults for these.
const REQUIRED_IN_PROD = ['FRONTEND_URL'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const isProd = (config.NODE_ENV ?? process.env.NODE_ENV) === 'production';
  const missing: string[] = [];

  for (const key of ALWAYS_REQUIRED) {
    if (!String(config[key] ?? '').trim()) missing.push(key);
  }
  if (isProd) {
    for (const key of REQUIRED_IN_PROD) {
      if (!String(config[key] ?? '').trim()) missing.push(key);
    }
  }

  const secret = String(config.JWT_SECRET ?? '');
  if (secret && secret.length < 16) {
    throw new Error(
      'JWT_SECRET is too short — use at least 32 random characters.',
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        `Set them before starting the API${isProd ? ' (production mode)' : ''}.`,
    );
  }

  return config;
}
