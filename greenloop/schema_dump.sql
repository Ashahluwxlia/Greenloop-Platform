

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_user_level"("user_points" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN CASE 
    WHEN user_points < 100 THEN 1
    WHEN user_points < 250 THEN 2
    WHEN user_points < 500 THEN 3
    WHEN user_points < 1000 THEN 4
    WHEN user_points < 2000 THEN 5
    WHEN user_points < 5000 THEN 6
    WHEN user_points < 10000 THEN 7
    WHEN user_points < 20000 THEN 8
    WHEN user_points < 50000 THEN 9
    ELSE 10
  END;
END;
$$;


ALTER FUNCTION "public"."calculate_user_level"("user_points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_award_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  badge_record RECORD;
  user_value INTEGER;
  target_user_id UUID;
BEGIN
  -- Determine the correct user_id based on trigger context
  -- When triggered from users table, use NEW.id
  -- When triggered from user_actions table, use NEW.user_id
  IF TG_TABLE_NAME = 'users' THEN
    target_user_id := NEW.id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- Loop through all active badges
  FOR badge_record IN 
    SELECT * FROM public.badges WHERE is_active = true
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = target_user_id AND badge_id = badge_record.id
    ) THEN
      -- Get user's current value for the badge criteria
      CASE badge_record.criteria_type
        WHEN 'points' THEN
          SELECT points INTO user_value FROM public.users WHERE id = target_user_id;
        WHEN 'actions' THEN
          SELECT COUNT(*) INTO user_value 
          FROM public.user_actions 
          WHERE user_id = target_user_id AND verification_status = 'approved';
        WHEN 'co2_saved' THEN
          SELECT FLOOR(total_co2_saved) INTO user_value 
          FROM public.users WHERE id = target_user_id;
        ELSE
          user_value := 0;
      END CASE;

      -- Award badge if criteria met
      IF user_value >= badge_record.criteria_value THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (target_user_id, badge_record.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_and_award_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_admin_activities"("p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "admin_name" "text", "action" character varying, "resource_type" character varying, "resource_id" "uuid", "details" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aalv.id,
    aalv.admin_name,
    aalv.action,
    aalv.resource_type,
    aalv.resource_id,
    aalv.details,
    aalv.created_at
  FROM admin_audit_log_view aalv
  ORDER BY aalv.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_recent_admin_activities"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_performers"("p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "full_name" "text", "email" character varying, "department" character varying, "points" integer, "level" integer, "total_co2_saved" numeric, "verified_actions" bigint, "team_name" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name || ' ' || u.last_name as full_name,
    u.email,
    u.department,
    u.points,
    u.level,
    u.total_co2_saved,
    COUNT(ua.id) as verified_actions,
    t.name as team_name
  FROM users u
  LEFT JOIN user_actions ua ON u.id = ua.user_id AND ua.verification_status = 'approved'
  LEFT JOIN team_members tm ON u.id = tm.user_id
  LEFT JOIN teams t ON tm.team_id = t.id
  WHERE u.is_active = true
  GROUP BY u.id, t.name
  ORDER BY u.points DESC, verified_actions DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_performers"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid") RETURNS TABLE("total_actions" bigint, "verified_actions" bigint, "pending_actions" bigint, "total_points" integer, "total_co2_saved" numeric, "current_level" integer, "badges_earned" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(ua.id) as total_actions,
    COUNT(CASE WHEN ua.verification_status = 'verified' THEN 1 END) as verified_actions,
    COUNT(CASE WHEN ua.verification_status = 'pending' THEN 1 END) as pending_actions,
    u.points as total_points,
    u.total_co2_saved,
    u.level as current_level,
    COUNT(ub.id) as badges_earned
  FROM users u
  LEFT JOIN user_actions ua ON u.id = ua.user_id
  LEFT JOIN user_badges ub ON u.id = ub.user_id
  WHERE u.id = p_user_id
  GROUP BY u.id, u.points, u.total_co2_saved, u.level;
END;
$$;


ALTER FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    department,
    job_title,
    employee_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'job_title',
    NEW.raw_user_meta_data ->> 'employee_id'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_activity"("p_admin_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO admin_audit_log (
        admin_user_id,
        action_type,
        target_table,
        target_id,
        new_values,
        created_at
    ) VALUES (
        p_admin_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        now()
    );
END;
$$;


ALTER FUNCTION "public"."log_admin_activity"("p_admin_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_single_team_stats"("target_team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_total_points INTEGER;
  new_total_co2 DECIMAL(10,2);
  current_team_leader_id UUID;
BEGIN
  -- Get team leader ID with proper table qualification
  SELECT t.team_leader_id INTO current_team_leader_id
  FROM public.teams t
  WHERE t.id = target_team_id;

  -- Calculate team totals including both team members AND team leader
  WITH team_users AS (
    -- Get all team members
    SELECT u.id, u.points, u.total_co2_saved
    FROM public.users u
    INNER JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.team_id = target_team_id
    
    UNION
    
    -- Add team leader (if not already included as member)
    SELECT u.id, u.points, u.total_co2_saved
    FROM public.users u
    WHERE u.id = current_team_leader_id
    AND NOT EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = target_team_id AND tm.user_id = current_team_leader_id
    )
  )
  SELECT 
    COALESCE(SUM(points), 0),
    COALESCE(SUM(total_co2_saved), 0)
  INTO new_total_points, new_total_co2
  FROM team_users;

  -- Update team record
  UPDATE public.teams
  SET 
    total_points = new_total_points,
    total_co2_saved = new_total_co2,
    updated_at = NOW()
  WHERE id = target_team_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_single_team_stats"("target_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simple_update_user_co2_savings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Added validation to ensure user_id exists and action is approved
  IF NEW.user_id IS NOT NULL AND NEW.verification_status = 'approved' THEN
    UPDATE public.users 
    SET total_co2_saved = COALESCE(total_co2_saved, 0) + NEW.co2_saved,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."simple_update_user_co2_savings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_challenge_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  participant_record RECORD;
  progress_value INTEGER;
  target_user_id UUID;
BEGIN
  -- Use NEW.id instead of NEW.user_id when triggered from users table
  -- Determine the user_id based on which table triggered this function
  IF TG_TABLE_NAME = 'users' THEN
    target_user_id := NEW.id;  -- When triggered from users table, use NEW.id
  ELSIF TG_TABLE_NAME = 'user_actions' THEN
    target_user_id := NEW.user_id;  -- When triggered from user_actions table, use NEW.user_id
  ELSE
    -- Fallback: try to determine from context
    target_user_id := COALESCE(NEW.id, NEW.user_id);
  END IF;

  -- Only proceed if we have a valid user_id
  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update progress for individual challenges
  FOR participant_record IN 
    SELECT cp.* FROM public.challenge_participants cp
    INNER JOIN public.challenges c ON cp.challenge_id = c.id
    WHERE cp.user_id = target_user_id 
    AND c.challenge_type = 'individual'
    AND c.start_date <= NOW() 
    AND c.end_date >= NOW()
    AND cp.completed = false
  LOOP
    -- Calculate progress based on challenge metric
    SELECT 
      CASE 
        WHEN c.target_metric = 'points' THEN u.points
        WHEN c.target_metric = 'actions' THEN (
          SELECT COUNT(*) FROM public.user_actions ua 
          WHERE ua.user_id = target_user_id 
          AND ua.completed_at >= c.start_date
          AND ua.verification_status = 'approved'
        )
        WHEN c.target_metric = 'co2_saved' THEN FLOOR(u.total_co2_saved)
        ELSE 0
      END INTO progress_value
    FROM public.users u, public.challenges c
    WHERE u.id = target_user_id AND c.id = participant_record.challenge_id;

    -- Update participant progress
    UPDATE public.challenge_participants
    SET 
      current_progress = progress_value,
      completed = (progress_value >= (
        SELECT target_value FROM public.challenges WHERE id = participant_record.challenge_id
      )),
      completed_at = CASE 
        WHEN progress_value >= (
          SELECT target_value FROM public.challenges WHERE id = participant_record.challenge_id
        ) THEN NOW()
        ELSE NULL
      END
    WHERE id = participant_record.id;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_challenge_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_team_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  team_id_to_update UUID;
  new_total_points INTEGER;
  new_total_co2 DECIMAL(10,2);
  current_team_leader_id UUID;
BEGIN
  -- Get team ID from different trigger sources
  IF TG_TABLE_NAME = 'user_actions' THEN
    -- Get all teams this user belongs to (since users can be in multiple teams)
    FOR team_id_to_update IN 
      SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = NEW.user_id
      UNION
      SELECT t.id FROM public.teams t WHERE t.team_leader_id = NEW.user_id
    LOOP
      -- Update each team this user belongs to
      PERFORM public.recalculate_single_team_stats(team_id_to_update);
    END LOOP;
    
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'team_members' THEN
    team_id_to_update := COALESCE(NEW.team_id, OLD.team_id);
  ELSIF TG_TABLE_NAME = 'users' THEN
    -- Get all teams this user is associated with
    FOR team_id_to_update IN 
      SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = NEW.id
      UNION
      SELECT t.id FROM public.teams t WHERE t.team_leader_id = NEW.id
    LOOP
      -- Update each team this user belongs to
      PERFORM public.recalculate_single_team_stats(team_id_to_update);
    END LOOP;
    
    RETURN NEW;
  END IF;

  -- For team_members table changes, update the specific team
  IF team_id_to_update IS NOT NULL THEN
    PERFORM public.recalculate_single_team_stats(team_id_to_update);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_team_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_co2_savings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_total_co2 DECIMAL(10,2);
BEGIN
  -- Calculate new total CO2 saved
  SELECT COALESCE(SUM(co2_saved), 0) INTO new_total_co2
  FROM public.user_actions
  WHERE user_id = NEW.user_id AND verification_status = 'approved';

  -- Update user record
  UPDATE public.users
  SET 
    total_co2_saved = new_total_co2,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_co2_savings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_level"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.level = calculate_user_level(NEW.points);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_level"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_total_points INTEGER;
  new_level INTEGER;
BEGIN
  -- Calculate new total points
  SELECT COALESCE(SUM(points), 0) INTO new_total_points
  FROM public.point_transactions
  WHERE user_id = NEW.user_id;

  -- Calculate new level (every 1000 points = 1 level)
  new_level := GREATEST(1, (new_total_points / 1000) + 1);

  -- Update user record
  UPDATE public.users
  SET 
    points = new_total_points,
    level = new_level,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_points"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."action_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_action_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer,
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."action_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text" DEFAULT '#10B981'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."action_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "description" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "department" "text",
    "job_title" "text",
    "employee_id" "text",
    "avatar_url" "text",
    "points" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "total_co2_saved" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "is_admin" boolean DEFAULT false
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."is_admin" IS 'Indicates if the user has administrative privileges';



CREATE OR REPLACE VIEW "public"."admin_audit_log_view" AS
 SELECT "aal"."id",
    "aal"."admin_user_id",
    (("u"."first_name" || ' '::"text") || "u"."last_name") AS "admin_name",
    "u"."email" AS "admin_email",
    "aal"."action_type" AS "action",
    "aal"."target_table" AS "resource_type",
    "aal"."target_id" AS "resource_id",
    "aal"."new_values" AS "details",
    "aal"."ip_address",
    "aal"."user_agent",
    "aal"."created_at"
   FROM ("public"."admin_audit_log" "aal"
     JOIN "public"."users" "u" ON (("aal"."admin_user_id" = "u"."id")))
  ORDER BY "aal"."created_at" DESC;


ALTER VIEW "public"."admin_audit_log_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sustainability_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "points_value" integer DEFAULT 10 NOT NULL,
    "co2_impact" numeric(8,2) DEFAULT 0 NOT NULL,
    "difficulty_level" integer DEFAULT 1,
    "estimated_time_minutes" integer,
    "instructions" "text",
    "verification_required" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sustainability_actions_difficulty_level_check" CHECK ((("difficulty_level" >= 1) AND ("difficulty_level" <= 5)))
);


ALTER TABLE "public"."sustainability_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_id" "uuid" NOT NULL,
    "points_earned" integer NOT NULL,
    "co2_saved" numeric(8,2) NOT NULL,
    "verification_status" "text" DEFAULT 'approved'::"text",
    "notes" "text",
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    CONSTRAINT "user_actions_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."user_actions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_category_breakdown" AS
 SELECT "ac"."name" AS "category_name",
    "count"("ua"."id") AS "action_count",
    "round"(((("count"("ua"."id"))::numeric / (NULLIF(( SELECT "count"(*) AS "count"
           FROM "public"."user_actions"
          WHERE ("user_actions"."verification_status" = 'approved'::"text")), 0))::numeric) * (100)::numeric), 1) AS "percentage",
    COALESCE("sum"("ua"."co2_saved"), (0)::numeric) AS "total_co2_impact",
    COALESCE("sum"("ua"."points_earned"), (0)::bigint) AS "total_points"
   FROM (("public"."action_categories" "ac"
     LEFT JOIN "public"."sustainability_actions" "sa" ON (("ac"."id" = "sa"."category_id")))
     LEFT JOIN "public"."user_actions" "ua" ON ((("sa"."id" = "ua"."action_id") AND ("ua"."verification_status" = 'approved'::"text"))))
  GROUP BY "ac"."id", "ac"."name"
  ORDER BY ("count"("ua"."id")) DESC;


ALTER VIEW "public"."admin_category_breakdown" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "team_id" "uuid",
    "current_progress" integer DEFAULT 0,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "challenge_participants_check" CHECK (((("user_id" IS NOT NULL) AND ("team_id" IS NULL)) OR (("user_id" IS NULL) AND ("team_id" IS NOT NULL))))
);


ALTER TABLE "public"."challenge_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "challenge_type" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "target_metric" "text" NOT NULL,
    "target_value" integer NOT NULL,
    "reward_points" integer DEFAULT 0,
    "reward_description" "text",
    "max_participants" integer,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'general'::"text",
    CONSTRAINT "challenges_challenge_type_check" CHECK (("challenge_type" = ANY (ARRAY['individual'::"text", 'team'::"text", 'company'::"text"])))
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_challenge_stats" AS
 SELECT "c"."id",
    "c"."title",
    "c"."description",
    "c"."category",
    "c"."challenge_type",
    "c"."target_metric",
    "c"."target_value",
    "c"."reward_points",
    "c"."start_date",
    "c"."end_date",
    "c"."is_active",
    "c"."created_at",
    "count"("cp"."id") AS "total_participants",
    "count"(
        CASE
            WHEN ("cp"."completed" = true) THEN 1
            ELSE NULL::integer
        END) AS "completed_count",
    "avg"("cp"."current_progress") AS "avg_progress"
   FROM ("public"."challenges" "c"
     LEFT JOIN "public"."challenge_participants" "cp" ON (("c"."id" = "cp"."challenge_id")))
  GROUP BY "c"."id", "c"."title", "c"."description", "c"."category", "c"."challenge_type", "c"."target_metric", "c"."target_value", "c"."reward_points", "c"."start_date", "c"."end_date", "c"."is_active", "c"."created_at"
  ORDER BY "c"."created_at" DESC;


ALTER VIEW "public"."admin_challenge_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "transaction_type" "text" NOT NULL,
    "reference_id" "uuid",
    "reference_type" "text",
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."point_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "team_leader_id" "uuid" NOT NULL,
    "max_members" integer DEFAULT 10,
    "total_points" integer DEFAULT 0,
    "total_co2_saved" numeric(10,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_dashboard_stats" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."users"
          WHERE ("users"."is_active" = true)) AS "active_users",
    ( SELECT "count"(*) AS "count"
           FROM "public"."users"
          WHERE ("users"."created_at" >= (CURRENT_DATE - '30 days'::interval))) AS "new_users_30d",
    ( SELECT "count"(DISTINCT "us"."user_id") AS "count"
           FROM "public"."user_sessions" "us"
          WHERE ("us"."created_at" >= (CURRENT_DATE - '7 days'::interval))) AS "active_users_7d",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_actions"
          WHERE ("user_actions"."verification_status" = 'approved'::"text")) AS "total_verified_actions",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_actions"
          WHERE ("user_actions"."verification_status" = 'pending'::"text")) AS "pending_actions",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_actions"
          WHERE ("user_actions"."completed_at" >= (CURRENT_DATE - '30 days'::interval))) AS "actions_30d",
    ( SELECT "count"(*) AS "count"
           FROM "public"."teams"
          WHERE ("teams"."is_active" = true)) AS "active_teams",
    ( SELECT "avg"("teams"."total_points") AS "avg"
           FROM "public"."teams"
          WHERE ("teams"."is_active" = true)) AS "avg_team_points",
    ( SELECT "count"(*) AS "count"
           FROM "public"."challenges"
          WHERE (("challenges"."is_active" = true) AND ("challenges"."end_date" > "now"()))) AS "active_challenges",
    ( SELECT "count"(*) AS "count"
           FROM "public"."challenge_participants"
          WHERE ("challenge_participants"."completed" = true)) AS "completed_challenges",
    ( SELECT COALESCE("sum"("users"."total_co2_saved"), (0)::numeric) AS "coalesce"
           FROM "public"."users") AS "total_co2_saved",
    ( SELECT COALESCE("sum"("user_actions"."co2_saved"), (0)::numeric) AS "coalesce"
           FROM "public"."user_actions"
          WHERE ("user_actions"."verification_status" = 'approved'::"text")) AS "verified_co2_impact",
    ( SELECT COALESCE("sum"("users"."points"), (0)::bigint) AS "coalesce"
           FROM "public"."users") AS "total_points_awarded",
    ( SELECT "count"(*) AS "count"
           FROM "public"."point_transactions"
          WHERE ("point_transactions"."created_at" >= (CURRENT_DATE - '7 days'::interval))) AS "recent_transactions";


ALTER VIEW "public"."admin_dashboard_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_monthly_trends" AS
 WITH "monthly_data" AS (
         SELECT "date_trunc"('month'::"text", "users"."created_at") AS "month",
            "count"(*) AS "new_users"
           FROM "public"."users"
          WHERE ("users"."created_at" >= (CURRENT_DATE - '1 year'::interval))
          GROUP BY ("date_trunc"('month'::"text", "users"."created_at"))
        ), "monthly_actions" AS (
         SELECT "date_trunc"('month'::"text", "user_actions"."completed_at") AS "month",
            "count"(*) AS "actions_completed"
           FROM "public"."user_actions"
          WHERE (("user_actions"."completed_at" >= (CURRENT_DATE - '1 year'::interval)) AND ("user_actions"."verification_status" = 'approved'::"text"))
          GROUP BY ("date_trunc"('month'::"text", "user_actions"."completed_at"))
        )
 SELECT COALESCE("md"."month", "ma"."month") AS "month",
    COALESCE("md"."new_users", (0)::bigint) AS "new_users",
    COALESCE("ma"."actions_completed", (0)::bigint) AS "actions_completed"
   FROM ("monthly_data" "md"
     FULL JOIN "monthly_actions" "ma" ON (("md"."month" = "ma"."month")))
  ORDER BY COALESCE("md"."month", "ma"."month");


ALTER VIEW "public"."admin_monthly_trends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_type" "text" NOT NULL,
    "granted_by" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."admin_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['leader'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_team_stats" AS
 WITH "team_member_counts" AS (
         SELECT "t_1"."id" AS "team_id",
            "count"("tm"."id") AS "member_count",
                CASE
                    WHEN (EXISTS ( SELECT 1
                       FROM "public"."team_members" "tm2"
                      WHERE (("tm2"."team_id" = "t_1"."id") AND ("tm2"."user_id" = "t_1"."team_leader_id")))) THEN 0
                    ELSE 1
                END AS "leader_not_member"
           FROM ("public"."teams" "t_1"
             LEFT JOIN "public"."team_members" "tm" ON (("t_1"."id" = "tm"."team_id")))
          GROUP BY "t_1"."id", "t_1"."team_leader_id"
        )
 SELECT "t"."id",
    "t"."name",
    "t"."description",
    "t"."team_leader_id",
    COALESCE("concat"("u"."first_name", ' ', "u"."last_name"), "u"."email", 'Unknown Leader'::"text") AS "leader_name",
    "t"."total_points",
    "t"."total_co2_saved",
    "t"."max_members",
    ("tmc"."member_count" + "tmc"."leader_not_member") AS "current_members",
    "t"."is_active",
    "t"."created_at"
   FROM (("public"."teams" "t"
     LEFT JOIN "public"."users" "u" ON (("t"."team_leader_id" = "u"."id")))
     LEFT JOIN "team_member_counts" "tmc" ON (("t"."id" = "tmc"."team_id")));


ALTER VIEW "public"."admin_team_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_user_stats" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "first_name",
    NULL::"text" AS "last_name",
    NULL::"text" AS "email",
    NULL::"text" AS "department",
    NULL::integer AS "points",
    NULL::integer AS "level",
    NULL::numeric(10,2) AS "total_co2_saved",
    NULL::boolean AS "is_active",
    NULL::boolean AS "is_admin",
    NULL::bigint AS "total_actions",
    NULL::bigint AS "verified_actions",
    NULL::"uuid" AS "team_id",
    NULL::"text" AS "team_name";


ALTER VIEW "public"."admin_user_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_weekly_activity" AS
 WITH "date_series" AS (
         SELECT ("generate_series"((CURRENT_DATE - '6 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::"date" AS "day"
        ), "daily_actions" AS (
         SELECT "date"("user_actions"."completed_at") AS "day",
            "count"(*) AS "actions"
           FROM "public"."user_actions"
          WHERE (("user_actions"."completed_at" >= (CURRENT_DATE - '6 days'::interval)) AND ("user_actions"."verification_status" = 'approved'::"text"))
          GROUP BY ("date"("user_actions"."completed_at"))
        ), "daily_users" AS (
         SELECT "date"("users"."created_at") AS "day",
            "count"(*) AS "new_users"
           FROM "public"."users"
          WHERE ("users"."created_at" >= (CURRENT_DATE - '6 days'::interval))
          GROUP BY ("date"("users"."created_at"))
        )
 SELECT "ds"."day",
    "to_char"(("ds"."day")::timestamp with time zone, 'Dy'::"text") AS "day_name",
    COALESCE("da"."actions", (0)::bigint) AS "actions",
    COALESCE("du"."new_users", (0)::bigint) AS "new_users"
   FROM (("date_series" "ds"
     LEFT JOIN "daily_actions" "da" ON (("ds"."day" = "da"."day")))
     LEFT JOIN "daily_users" "du" ON (("ds"."day" = "du"."day")))
  ORDER BY "ds"."day";


ALTER VIEW "public"."admin_weekly_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon_url" "text",
    "criteria_type" "text" NOT NULL,
    "criteria_value" integer NOT NULL,
    "badge_color" "text" DEFAULT '#F59E0B'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" DEFAULT 'action'::"text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "points" integer DEFAULT 0,
    "co2_impact" numeric(8,2) DEFAULT 0,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "content_items_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "content_items_type_check" CHECK (("type" = ANY (ARRAY['action'::"text", 'announcement'::"text", 'educational'::"text", 'challenge'::"text"])))
);


ALTER TABLE "public"."content_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "excerpt" "text",
    "featured_image_url" "text",
    "author_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "tags" "text"[],
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_resets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_value" "text" NOT NULL,
    "setting_type" "text" DEFAULT 'string'::"text",
    "description" "text",
    "is_public" boolean DEFAULT false,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "key" character varying(100) NOT NULL,
    "category" character varying(50) DEFAULT 'general'::character varying,
    "data_type" character varying(20) DEFAULT 'string'::character varying,
    CONSTRAINT "system_settings_setting_type_check" CHECK (("setting_type" = ANY (ARRAY['string'::"text", 'number'::"text", 'boolean'::"text", 'json'::"text"])))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."team_performance_summary" AS
 WITH "team_user_stats" AS (
         SELECT DISTINCT "t"."id" AS "team_id",
            "t"."name" AS "team_name",
            "u"."id" AS "user_id",
            "u"."first_name",
            "u"."last_name",
            "u"."email",
            "u"."points",
            "u"."total_co2_saved",
            "u"."level",
            "u"."department",
            "u"."job_title",
                CASE
                    WHEN ("u"."id" = "t"."team_leader_id") THEN true
                    ELSE false
                END AS "is_leader",
            COALESCE("tm"."joined_at", "t"."created_at") AS "joined_at",
            ( SELECT "count"(*) AS "count"
                   FROM "public"."user_actions" "ua"
                  WHERE (("ua"."user_id" = "u"."id") AND ("ua"."verification_status" = 'approved'::"text"))) AS "verified_actions"
           FROM (("public"."teams" "t"
             LEFT JOIN "public"."team_members" "tm" ON (("t"."id" = "tm"."team_id")))
             LEFT JOIN "public"."users" "u" ON (("u"."id" = "tm"."user_id")))
          WHERE (("t"."is_active" = true) AND ("u"."id" IS NOT NULL))
        UNION
         SELECT "t"."id" AS "team_id",
            "t"."name" AS "team_name",
            "u"."id" AS "user_id",
            "u"."first_name",
            "u"."last_name",
            "u"."email",
            "u"."points",
            "u"."total_co2_saved",
            "u"."level",
            "u"."department",
            "u"."job_title",
            true AS "is_leader",
            "t"."created_at" AS "joined_at",
            ( SELECT "count"(*) AS "count"
                   FROM "public"."user_actions" "ua"
                  WHERE (("ua"."user_id" = "u"."id") AND ("ua"."verification_status" = 'approved'::"text"))) AS "verified_actions"
           FROM ("public"."teams" "t"
             JOIN "public"."users" "u" ON (("u"."id" = "t"."team_leader_id")))
          WHERE (("t"."is_active" = true) AND (NOT (EXISTS ( SELECT 1
                   FROM "public"."team_members" "tm"
                  WHERE (("tm"."team_id" = "t"."id") AND ("tm"."user_id" = "t"."team_leader_id"))))))
        )
 SELECT "team_id",
    "team_name",
    "user_id",
    "first_name",
    "last_name",
    "email",
    "points",
    "total_co2_saved",
    "level",
    "department",
    "job_title",
    "is_leader",
    "joined_at",
    "verified_actions",
    "sum"("points") OVER (PARTITION BY "team_id") AS "team_total_points",
    "sum"("total_co2_saved") OVER (PARTITION BY "team_id") AS "team_total_co2",
    "count"(*) OVER (PARTITION BY "team_id") AS "team_member_count",
    "avg"("points") OVER (PARTITION BY "team_id") AS "team_avg_points",
    "avg"("total_co2_saved") OVER (PARTITION BY "team_id") AS "team_avg_co2"
   FROM "team_user_stats"
  ORDER BY "team_id", "is_leader" DESC, "points" DESC;


ALTER VIEW "public"."team_performance_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."team_performance_summary" IS 'Team performance summary view - fixed to prevent duplicate team leader entries';



CREATE TABLE IF NOT EXISTS "public"."user_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "session_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_team_memberships" AS
 SELECT "u"."id" AS "user_id",
    "u"."first_name",
    "u"."last_name",
    "u"."email",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."description" AS "team_description",
        CASE
            WHEN ("u"."id" = "t"."team_leader_id") THEN 'leader'::"text"
            ELSE 'member'::"text"
        END AS "role",
    COALESCE("tm"."joined_at", "t"."created_at") AS "joined_at",
    "t"."total_points" AS "team_total_points",
    "t"."total_co2_saved" AS "team_total_co2"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."team_members" "tm" ON (("u"."id" = "tm"."user_id")))
     LEFT JOIN "public"."teams" "t" ON ((("t"."id" = "tm"."team_id") OR ("t"."team_leader_id" = "u"."id"))))
  WHERE ("t"."is_active" = true)
  ORDER BY "u"."id", "t"."name";


ALTER VIEW "public"."user_team_memberships" OWNER TO "postgres";


ALTER TABLE ONLY "public"."action_attachments"
    ADD CONSTRAINT "action_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_categories"
    ADD CONSTRAINT "action_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."action_categories"
    ADD CONSTRAINT "action_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_user_id_permission_type_key" UNIQUE ("user_id", "permission_type");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_resets"
    ADD CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_resets"
    ADD CONSTRAINT "password_resets_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sustainability_actions"
    ADD CONSTRAINT "sustainability_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_user_unique" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_actions"
    ADD CONSTRAINT "user_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_audit_log_action" ON "public"."admin_audit_log" USING "btree" ("action_type");



CREATE INDEX "idx_admin_audit_log_target" ON "public"."admin_audit_log" USING "btree" ("target_table", "target_id");



CREATE INDEX "idx_admin_permissions_active" ON "public"."admin_permissions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_challenge_participants_challenge_completed" ON "public"."challenge_participants" USING "btree" ("challenge_id", "completed");



CREATE INDEX "idx_challenge_participants_challenge_id" ON "public"."challenge_participants" USING "btree" ("challenge_id");



CREATE INDEX "idx_challenges_category" ON "public"."challenges" USING "btree" ("category");



CREATE INDEX "idx_challenges_challenge_type" ON "public"."challenges" USING "btree" ("challenge_type");



CREATE INDEX "idx_challenges_created_by" ON "public"."challenges" USING "btree" ("created_by");



CREATE INDEX "idx_challenges_end_date" ON "public"."challenges" USING "btree" ("end_date");



CREATE INDEX "idx_challenges_start_date" ON "public"."challenges" USING "btree" ("start_date");



CREATE INDEX "idx_content_items_category" ON "public"."content_items" USING "btree" ("category");



CREATE INDEX "idx_content_items_created_by" ON "public"."content_items" USING "btree" ("created_by");



CREATE INDEX "idx_content_items_status" ON "public"."content_items" USING "btree" ("status");



CREATE INDEX "idx_content_items_type" ON "public"."content_items" USING "btree" ("type");



CREATE INDEX "idx_news_articles_category" ON "public"."news_articles" USING "btree" ("category");



CREATE INDEX "idx_news_articles_featured" ON "public"."news_articles" USING "btree" ("is_featured");



CREATE INDEX "idx_news_articles_published" ON "public"."news_articles" USING "btree" ("is_published", "published_at");



CREATE INDEX "idx_news_articles_published_at" ON "public"."news_articles" USING "btree" ("published_at");



CREATE INDEX "idx_point_transactions_reference_type" ON "public"."point_transactions" USING "btree" ("reference_type");



CREATE INDEX "idx_point_transactions_transaction_type" ON "public"."point_transactions" USING "btree" ("transaction_type");



CREATE INDEX "idx_point_transactions_user_id" ON "public"."point_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_sustainability_actions_active" ON "public"."sustainability_actions" USING "btree" ("is_active");



CREATE INDEX "idx_sustainability_actions_category_id" ON "public"."sustainability_actions" USING "btree" ("category_id");



CREATE INDEX "idx_sustainability_actions_difficulty" ON "public"."sustainability_actions" USING "btree" ("difficulty_level");



CREATE INDEX "idx_system_settings_category" ON "public"."system_settings" USING "btree" ("category");



CREATE INDEX "idx_system_settings_data_type" ON "public"."system_settings" USING "btree" ("data_type");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_team_role" ON "public"."team_members" USING "btree" ("team_id", "role");



CREATE INDEX "idx_team_members_team_user" ON "public"."team_members" USING "btree" ("team_id", "user_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_is_active" ON "public"."teams" USING "btree" ("is_active");



CREATE INDEX "idx_teams_team_leader_id" ON "public"."teams" USING "btree" ("team_leader_id");



CREATE INDEX "idx_teams_total_points" ON "public"."teams" USING "btree" ("total_points");



CREATE INDEX "idx_user_actions_completed_at" ON "public"."user_actions" USING "btree" ("completed_at");



CREATE INDEX "idx_user_actions_user_id" ON "public"."user_actions" USING "btree" ("user_id");



CREATE INDEX "idx_user_actions_user_status" ON "public"."user_actions" USING "btree" ("user_id", "verification_status");



CREATE INDEX "idx_user_actions_verification_status" ON "public"."user_actions" USING "btree" ("verification_status");



CREATE INDEX "idx_user_analytics_event_type" ON "public"."user_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_user_analytics_user_id" ON "public"."user_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_users_department" ON "public"."users" USING "btree" ("department");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_employee_id" ON "public"."users" USING "btree" ("employee_id");



CREATE INDEX "idx_users_is_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_is_admin" ON "public"."users" USING "btree" ("is_admin") WHERE ("is_admin" = true);



CREATE INDEX "idx_users_level" ON "public"."users" USING "btree" ("level");



CREATE INDEX "idx_users_points" ON "public"."users" USING "btree" ("points");



CREATE OR REPLACE VIEW "public"."admin_user_stats" AS
 SELECT "u"."id",
    "u"."first_name",
    "u"."last_name",
    "u"."email",
    "u"."department",
    "u"."points",
    "u"."level",
    "u"."total_co2_saved",
    "u"."is_active",
    "u"."is_admin",
    "count"("ua"."id") AS "total_actions",
    "count"(
        CASE
            WHEN ("ua"."verification_status" = 'verified'::"text") THEN 1
            ELSE NULL::integer
        END) AS "verified_actions",
    "tm"."team_id",
    "t"."name" AS "team_name"
   FROM ((("public"."users" "u"
     LEFT JOIN "public"."user_actions" "ua" ON (("u"."id" = "ua"."user_id")))
     LEFT JOIN "public"."team_members" "tm" ON (("u"."id" = "tm"."user_id")))
     LEFT JOIN "public"."teams" "t" ON (("tm"."team_id" = "t"."id")))
  GROUP BY "u"."id", "tm"."team_id", "t"."name";



CREATE OR REPLACE TRIGGER "on_point_transaction_created" AFTER INSERT ON "public"."point_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_points"();



CREATE OR REPLACE TRIGGER "on_team_member_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_stats"();



CREATE OR REPLACE TRIGGER "on_user_action_challenge_progress" AFTER INSERT OR UPDATE ON "public"."user_actions" FOR EACH ROW WHEN (("new"."verification_status" = 'approved'::"text")) EXECUTE FUNCTION "public"."update_challenge_progress"();



CREATE OR REPLACE TRIGGER "on_user_action_for_team_stats" AFTER INSERT OR UPDATE ON "public"."user_actions" FOR EACH ROW WHEN (("new"."verification_status" = 'approved'::"text")) EXECUTE FUNCTION "public"."update_team_stats"();



CREATE OR REPLACE TRIGGER "on_user_progress_updated" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_challenge_progress"();



CREATE OR REPLACE TRIGGER "on_user_stats_for_team_update" AFTER UPDATE ON "public"."users" FOR EACH ROW WHEN ((("old"."points" <> "new"."points") OR ("old"."total_co2_saved" <> "new"."total_co2_saved"))) EXECUTE FUNCTION "public"."update_team_stats"();



CREATE OR REPLACE TRIGGER "on_user_stats_updated" AFTER UPDATE ON "public"."users" FOR EACH ROW WHEN ((("old"."points" <> "new"."points") OR ("old"."total_co2_saved" <> "new"."total_co2_saved"))) EXECUTE FUNCTION "public"."check_and_award_badges"();



CREATE OR REPLACE TRIGGER "simple_on_user_action_approved" AFTER INSERT OR UPDATE ON "public"."user_actions" FOR EACH ROW EXECUTE FUNCTION "public"."simple_update_user_co2_savings"();



CREATE OR REPLACE TRIGGER "trigger_update_user_level" BEFORE UPDATE OF "points" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_level"();



ALTER TABLE ONLY "public"."action_attachments"
    ADD CONSTRAINT "action_attachments_user_action_id_fkey" FOREIGN KEY ("user_action_id") REFERENCES "public"."user_actions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."password_resets"
    ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sustainability_actions"
    ADD CONSTRAINT "sustainability_actions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."action_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_actions"
    ADD CONSTRAINT "user_actions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."sustainability_actions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_actions"
    ADD CONSTRAINT "user_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_actions"
    ADD CONSTRAINT "user_actions_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."action_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "action_attachments_insert_own" ON "public"."action_attachments" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "user_actions"."user_id"
   FROM "public"."user_actions"
  WHERE ("user_actions"."id" = "action_attachments"."user_action_id"))));



CREATE POLICY "action_attachments_select_own" ON "public"."action_attachments" FOR SELECT USING (("auth"."uid"() IN ( SELECT "user_actions"."user_id"
   FROM "public"."user_actions"
  WHERE ("user_actions"."id" = "action_attachments"."user_action_id"))));



ALTER TABLE "public"."action_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "action_categories_delete_admin" ON "public"."action_categories" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "action_categories_insert_admin" ON "public"."action_categories" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "action_categories_select_all" ON "public"."action_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "action_categories_update_admin" ON "public"."action_categories" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_log_select_admin" ON "public"."admin_audit_log" FOR SELECT USING (("auth"."uid"() IN ( SELECT "admin_permissions"."user_id"
   FROM "public"."admin_permissions"
  WHERE (("admin_permissions"."permission_type" = 'super_admin'::"text") AND ("admin_permissions"."is_active" = true)))));



ALTER TABLE "public"."admin_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_permissions_select_own" ON "public"."admin_permissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges_select_all" ON "public"."badges" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."challenge_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "challenge_participants_insert_own" ON "public"."challenge_participants" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "team_members"."user_id"
   FROM "public"."team_members"
  WHERE ("team_members"."team_id" = "challenge_participants"."team_id")))));



CREATE POLICY "challenge_participants_select_all" ON "public"."challenge_participants" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "challenge_participants_update_own" ON "public"."challenge_participants" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "team_members"."user_id"
   FROM "public"."team_members"
  WHERE ("team_members"."team_id" = "challenge_participants"."team_id")))));



ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "challenges_delete_admin" ON "public"."challenges" FOR DELETE USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true)))));



CREATE POLICY "challenges_insert_admin_or_creator" ON "public"."challenges" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true))))));



CREATE POLICY "challenges_select_all" ON "public"."challenges" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "challenges_update_admin_or_creator" ON "public"."challenges" FOR UPDATE USING ((("auth"."uid"() = "created_by") OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true))))));



ALTER TABLE "public"."content_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_items_delete_admin" ON "public"."content_items" FOR DELETE USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true)))));



CREATE POLICY "content_items_insert_admin" ON "public"."content_items" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true)))));



CREATE POLICY "content_items_select_published" ON "public"."content_items" FOR SELECT USING ((("status" = 'published'::"text") OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true))))));



CREATE POLICY "content_items_update_admin" ON "public"."content_items" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true)))));



ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "news_articles_select_published" ON "public"."news_articles" FOR SELECT USING (("is_published" = true));



ALTER TABLE "public"."password_resets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "password_resets_select_own" ON "public"."password_resets" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."point_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "point_transactions_insert_own" ON "public"."point_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "point_transactions_select_own" ON "public"."point_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sustainability_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sustainability_actions_delete_admin" ON "public"."sustainability_actions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "sustainability_actions_insert_admin" ON "public"."sustainability_actions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "sustainability_actions_select_all" ON "public"."sustainability_actions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "sustainability_actions_update_admin" ON "public"."sustainability_actions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_settings_admin_delete" ON "public"."system_settings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "system_settings_admin_insert" ON "public"."system_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "system_settings_admin_select_all" ON "public"."system_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "system_settings_admin_update" ON "public"."system_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "system_settings_select_public" ON "public"."system_settings" FOR SELECT USING (("is_public" = true));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_delete_own_or_leader" ON "public"."team_members" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "teams"."team_leader_id"
   FROM "public"."teams"
  WHERE ("teams"."id" = "team_members"."team_id")))));



CREATE POLICY "team_members_insert_own_or_leader" ON "public"."team_members" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "teams"."team_leader_id"
   FROM "public"."teams"
  WHERE ("teams"."id" = "team_members"."team_id")))));



CREATE POLICY "team_members_select_all" ON "public"."team_members" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_admin" ON "public"."teams" FOR DELETE USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true)))));



CREATE POLICY "teams_insert_admin_or_leader" ON "public"."teams" FOR INSERT WITH CHECK ((("auth"."uid"() = "team_leader_id") OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true))))));



CREATE POLICY "teams_select_all" ON "public"."teams" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "teams_update_admin_or_leader" ON "public"."teams" FOR UPDATE USING ((("auth"."uid"() = "team_leader_id") OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."is_admin" = true) AND ("users"."is_active" = true))))));



CREATE POLICY "teams_update_leader" ON "public"."teams" FOR UPDATE USING (("auth"."uid"() = "team_leader_id"));



ALTER TABLE "public"."user_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_actions_insert_own" ON "public"."user_actions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_actions_select_own" ON "public"."user_actions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_actions_select_public" ON "public"."user_actions" FOR SELECT USING (("verification_status" = 'approved'::"text"));



CREATE POLICY "user_actions_update_own" ON "public"."user_actions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_analytics_insert_own" ON "public"."user_analytics" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_analytics_select_own" ON "public"."user_analytics" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_badges_insert_own" ON "public"."user_badges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_badges_select_all" ON "public"."user_badges" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_sessions_delete_own" ON "public"."user_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_sessions_insert_own" ON "public"."user_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_sessions_select_own" ON "public"."user_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_admin" ON "public"."users" FOR DELETE USING (("auth"."uid"() IN ( SELECT "users_1"."id"
   FROM "public"."users" "users_1"
  WHERE (("users_1"."is_admin" = true) AND ("users_1"."is_active" = true)))));



CREATE POLICY "users_insert_admin_or_own" ON "public"."users" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") OR ("auth"."uid"() IN ( SELECT "users_1"."id"
   FROM "public"."users" "users_1"
  WHERE (("users_1"."is_admin" = true) AND ("users_1"."is_active" = true))))));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_select_public_info" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "users_update_admin_or_own" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") OR ("auth"."uid"() IN ( SELECT "users_1"."id"
   FROM "public"."users" "users_1"
  WHERE (("users_1"."is_admin" = true) AND ("users_1"."is_active" = true))))));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_user_level"("user_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_user_level"("user_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_user_level"("user_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_award_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_award_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_award_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_admin_activities"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_admin_activities"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_admin_activities"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_performers"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_performers"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_performers"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_activity"("p_admin_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_activity"("p_admin_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_activity"("p_admin_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_single_team_stats"("target_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_single_team_stats"("target_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_single_team_stats"("target_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."simple_update_user_co2_savings"() TO "anon";
GRANT ALL ON FUNCTION "public"."simple_update_user_co2_savings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."simple_update_user_co2_savings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_challenge_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_challenge_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_challenge_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_co2_savings"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_co2_savings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_co2_savings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_level"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_level"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_level"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_points"() TO "service_role";


















GRANT ALL ON TABLE "public"."action_attachments" TO "anon";
GRANT ALL ON TABLE "public"."action_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."action_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."action_categories" TO "anon";
GRANT ALL ON TABLE "public"."action_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."action_categories" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log_view" TO "service_role";



GRANT ALL ON TABLE "public"."sustainability_actions" TO "anon";
GRANT ALL ON TABLE "public"."sustainability_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."sustainability_actions" TO "service_role";



GRANT ALL ON TABLE "public"."user_actions" TO "anon";
GRANT ALL ON TABLE "public"."user_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_actions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_category_breakdown" TO "anon";
GRANT ALL ON TABLE "public"."admin_category_breakdown" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_category_breakdown" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_participants" TO "anon";
GRANT ALL ON TABLE "public"."challenge_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_participants" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."admin_challenge_stats" TO "anon";
GRANT ALL ON TABLE "public"."admin_challenge_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_challenge_stats" TO "service_role";



GRANT ALL ON TABLE "public"."point_transactions" TO "anon";
GRANT ALL ON TABLE "public"."point_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."point_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_dashboard_stats" TO "anon";
GRANT ALL ON TABLE "public"."admin_dashboard_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_dashboard_stats" TO "service_role";



GRANT ALL ON TABLE "public"."admin_monthly_trends" TO "anon";
GRANT ALL ON TABLE "public"."admin_monthly_trends" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_monthly_trends" TO "service_role";



GRANT ALL ON TABLE "public"."admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."admin_team_stats" TO "anon";
GRANT ALL ON TABLE "public"."admin_team_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_team_stats" TO "service_role";



GRANT ALL ON TABLE "public"."admin_user_stats" TO "anon";
GRANT ALL ON TABLE "public"."admin_user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."admin_weekly_activity" TO "anon";
GRANT ALL ON TABLE "public"."admin_weekly_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_weekly_activity" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."content_items" TO "anon";
GRANT ALL ON TABLE "public"."content_items" TO "authenticated";
GRANT ALL ON TABLE "public"."content_items" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."password_resets" TO "anon";
GRANT ALL ON TABLE "public"."password_resets" TO "authenticated";
GRANT ALL ON TABLE "public"."password_resets" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."team_performance_summary" TO "anon";
GRANT ALL ON TABLE "public"."team_performance_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."team_performance_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_analytics" TO "anon";
GRANT ALL ON TABLE "public"."user_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_team_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_team_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_team_memberships" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
