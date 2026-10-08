import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function createDatabase(databaseUrl: string | undefined) {
  if (!databaseUrl) throw new Error('Database configuration unavailable');
  const url = new URL(databaseUrl);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.searchParams.get('sslmode') !== 'require'
  ) {
    throw new Error('Invalid database configuration');
  }
  // HTTP queries need no connection pool or nodejs_compat flag in Workers.
  return drizzle(neon(databaseUrl), { schema });
}

export type Database = ReturnType<typeof createDatabase>;
