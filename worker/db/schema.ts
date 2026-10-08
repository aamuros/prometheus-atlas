import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core';

export const atlasRole = pgEnum('atlas_role', ['admin', 'developer']);

export const atlasMembers = pgTable(
  'atlas_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accessIssuer: text('access_issuer').notNull(),
    accessSubject: text('access_subject').notNull(),
    email: text('email').notNull(),
    role: atlasRole('role').default('developer').notNull(),
    active: boolean('active').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('atlas_members_access_identity_unique').on(
      table.accessIssuer,
      table.accessSubject,
    ),
  ],
);

export type AtlasMember = typeof atlasMembers.$inferSelect;
