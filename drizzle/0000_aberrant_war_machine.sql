CREATE TYPE "public"."atlas_role" AS ENUM('admin', 'developer');--> statement-breakpoint
CREATE TABLE "atlas_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_issuer" text NOT NULL,
	"access_subject" text NOT NULL,
	"email" text NOT NULL,
	"role" "atlas_role" DEFAULT 'developer' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atlas_members_access_identity_unique" UNIQUE("access_issuer","access_subject")
);
