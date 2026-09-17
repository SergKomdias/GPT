import { validTimezone } from '../shared/learning';
export function validateConfig(env = process.env) {
  if (env.NODE_ENV === 'production') {
    if (env.ENABLE_DEMO !== 'false') throw new Error('Production requires ENABLE_DEMO=false');
    if (!env.DATABASE_URL?.startsWith('postgres'))
      throw new Error('Production requires external PostgreSQL');
    if (!env.APP_ORIGIN || new URL(env.APP_ORIGIN).protocol !== 'https:')
      throw new Error('Production requires an HTTPS APP_ORIGIN');
    if (new URL(env.APP_ORIGIN).origin !== env.APP_ORIGIN)
      throw new Error('APP_ORIGIN must be an origin without a path');
  }
  if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required for live AI');
  const days = Number(env.SPEAKING_RETENTION_DAYS || 30);
  if (!Number.isInteger(days) || days < 1 || days > 30)
    throw new Error('Speaking retention must be 1–30 days');
  if (!validTimezone(env.PILOT_TIMEZONE || 'Europe/Kyiv'))
    throw new Error('Invalid pilot timezone');
}
