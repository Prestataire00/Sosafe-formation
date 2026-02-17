CREATE TABLE "attendance_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheet_id" varchar NOT NULL,
	"trainee_id" varchar NOT NULL,
	"status" text DEFAULT 'absent' NOT NULL,
	"signed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "attendance_sheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"date" date NOT NULL,
	"period" text DEFAULT 'journee' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"event" text NOT NULL,
	"action" text DEFAULT 'send_email' NOT NULL,
	"template_id" varchar,
	"delay" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"conditions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'convention' NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elearning_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" varchar NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"video_url" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elearning_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar,
	"session_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"scheduled_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"type" text DEFAULT 'manual' NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"trainee_id" varchar NOT NULL,
	"enterprise_id" varchar,
	"status" text DEFAULT 'registered' NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"certificate_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "enterprise_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'general' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enterprises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"siret" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"sector" text,
	"status" text DEFAULT 'active' NOT NULL,
	"format_juridique" text,
	"tva_number" text,
	"email" text,
	"phone" text,
	"legal_rep_name" text,
	"legal_rep_email" text,
	"legal_rep_phone" text
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"session_id" varchar,
	"trainee_id" varchar,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"quote_id" varchar,
	"enterprise_id" varchar,
	"session_id" varchar,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax_rate" integer DEFAULT 2000 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "learner_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainee_id" varchar NOT NULL,
	"module_id" varchar NOT NULL,
	"block_id" varchar,
	"completed" boolean DEFAULT false,
	"score" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'virement' NOT NULL,
	"reference" text,
	"paid_at" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"objectives" text,
	"prerequisites" text,
	"modality" text DEFAULT 'presentiel' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"certifying" boolean DEFAULT false,
	"recycling_months" integer
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"status" text DEFAULT 'prospect' NOT NULL,
	"source" text,
	"notes" text,
	"estimated_revenue" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'improvement' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to" text,
	"due_date" date,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" varchar NOT NULL,
	"question" text NOT NULL,
	"type" text DEFAULT 'qcm' NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb,
	"correct_answer" integer DEFAULT 0 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"prospect_id" varchar,
	"enterprise_id" varchar,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax_rate" integer DEFAULT 2000 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"valid_until" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quotes_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"trainer_id" varchar,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"location" text,
	"modality" text DEFAULT 'presentiel' NOT NULL,
	"max_participants" integer DEFAULT 12 NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signer_id" varchar NOT NULL,
	"signer_type" text NOT NULL,
	"document_type" text NOT NULL,
	"related_id" varchar,
	"signature_data" text,
	"signed_at" timestamp DEFAULT now(),
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar NOT NULL,
	"session_id" varchar,
	"trainee_id" varchar,
	"answers" jsonb DEFAULT '[]'::jsonb,
	"rating" integer,
	"comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "survey_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"category" text DEFAULT 'satisfaction' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trainees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"enterprise_id" varchar,
	"status" text DEFAULT 'active' NOT NULL,
	"avatar_url" text,
	"civility" text,
	"date_of_birth" date,
	"city_of_birth" text,
	"department" text,
	"pole_emploi_id" text,
	"dietary_regime" text,
	"image_rights_consent" boolean,
	"profile_type" text DEFAULT 'salarie',
	"pro_statut" text,
	"pro_denomination" text,
	"pro_siret" text,
	"pro_tva" text,
	CONSTRAINT "trainees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "trainer_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"type" text DEFAULT 'autre' NOT NULL,
	"title" text NOT NULL,
	"file_url" text,
	"file_content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"validated_by" varchar,
	"expires_at" date,
	"uploaded_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trainer_evaluations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"session_id" varchar,
	"evaluator_id" varchar,
	"year" integer NOT NULL,
	"overall_rating" integer,
	"strengths" text,
	"improvements" text,
	"notes" text,
	"satisfaction_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"specialty" text,
	"bio" text,
	"status" text DEFAULT 'active' NOT NULL,
	"avatar_url" text,
	CONSTRAINT "trainers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"owner_type" text NOT NULL,
	"title" text NOT NULL,
	"file_name" text,
	"file_url" text,
	"file_size" integer,
	"mime_type" text,
	"category" text DEFAULT 'autre',
	"uploaded_at" timestamp DEFAULT now(),
	"uploaded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text,
	"trainer_id" varchar,
	"trainee_id" varchar,
	"enterprise_id" varchar,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
