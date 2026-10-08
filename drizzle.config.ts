import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL_UNPOOLED;
if (url) {
  const parsed = new URL(url);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    parsed.hostname.includes('-pooler') ||
    parsed.searchParams.get('sslmode') !== 'require'
  )
    throw new Error('Migrations require a direct TLS PostgreSQL connection');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './worker/db/schema.ts',
  out: './drizzle',
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
});
