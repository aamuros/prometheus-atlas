import type { AtlasMember } from './db/schema';
import type { VerifiedIdentity } from './features/auth/identity';

// Optional in the type because bindings can be absent; protected routes fail closed.
export type WorkerBindings = {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  DATABASE_URL?: string;
};

export type AtlasEnv = {
  Bindings: WorkerBindings;
  Variables: { identity: VerifiedIdentity; member: AtlasMember };
};
