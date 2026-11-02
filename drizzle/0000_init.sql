CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"test_link" text,
	"token_hash" text NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invite_expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"access_expires_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"invite_email_id" text,
	"access_email_id" text,
	"invite_send_count" integer DEFAULT 0 NOT NULL,
	"access_send_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "invites_email_unique" ON "invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_token_hash_unique" ON "invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invites_status_idx" ON "invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invites_created_at_idx" ON "invites" USING btree ("created_at");