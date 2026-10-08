import { and, eq } from 'drizzle-orm';
import type { VerifiedIdentity } from '../features/auth/identity';
import type { Database } from './client';
import { atlasMembers } from './schema';

export async function findMember(db: Database, identity: VerifiedIdentity) {
  const [member] = await db
    .select()
    .from(atlasMembers)
    .where(
      and(
        eq(atlasMembers.accessIssuer, identity.issuer),
        eq(atlasMembers.accessSubject, identity.subject),
      ),
    )
    .limit(1);
  return member;
}

export async function listMembers(db: Database) {
  return db
    .select({
      id: atlasMembers.id,
      email: atlasMembers.email,
      role: atlasMembers.role,
      active: atlasMembers.active,
    })
    .from(atlasMembers)
    .orderBy(atlasMembers.createdAt);
}
