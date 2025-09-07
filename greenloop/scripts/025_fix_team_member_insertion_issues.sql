-- Fix RLS policies and ambiguous column references for team member insertion

-- First, let's fix the ambiguous column reference in the update_team_stats function
-- The issue is likely in the trigger function where team_leader_id is referenced without table prefix

CREATE OR REPLACE FUNCTION update_team_stats()
RETURNS TRIGGER AS $$
DECLARE
    team_id_to_update UUID;
    new_total_points INTEGER;
    new_total_co2 NUMERIC;
    new_member_count INTEGER;
BEGIN
    -- Determine which team to update based on the operation
    IF TG_OP = 'DELETE' THEN
        team_id_to_update := OLD.team_id;
    ELSE
        team_id_to_update := NEW.team_id;
    END IF;

    -- Calculate total points and CO2 from team members AND team leader
    WITH team_contributions AS (
        -- Get contributions from team members
        SELECT 
            u.points,
            u.total_co2_saved
        FROM public.users u
        INNER JOIN public.team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = team_id_to_update
        
        UNION ALL
        
        -- Get contributions from team leader
        SELECT 
            u.points,
            u.total_co2_saved
        FROM public.users u
        INNER JOIN public.teams t ON u.id = t.team_leader_id  -- Added table prefix to fix ambiguous reference
        WHERE t.id = team_id_to_update
    )
    SELECT 
        COALESCE(SUM(points), 0),
        COALESCE(SUM(total_co2_saved), 0)
    INTO new_total_points, new_total_co2
    FROM team_contributions;

    -- Count current members (excluding leader)
    SELECT COUNT(*)
    INTO new_member_count
    FROM public.team_members tm
    WHERE tm.team_id = team_id_to_update;

    -- Update the team totals
    UPDATE public.teams 
    SET 
        total_points = new_total_points,
        total_co2_saved = new_total_co2,
        updated_at = NOW()
    WHERE id = team_id_to_update;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix RLS policies for team_members table to allow admin operations
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage all team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team leaders can manage their team members" ON public.team_members;

-- Create comprehensive RLS policies for team_members
CREATE POLICY "Admin can manage all team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

CREATE POLICY "Users can view team members" ON public.team_members
    FOR SELECT USING (
        -- Users can see members of teams they belong to
        team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
        OR
        -- Users can see members of teams they lead
        team_id IN (
            SELECT id FROM public.teams WHERE team_leader_id = auth.uid()
        )
        OR
        -- Admins can see all
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

CREATE POLICY "Team leaders can manage their team members" ON public.team_members
    FOR ALL USING (
        team_id IN (
            SELECT id FROM public.teams WHERE team_leader_id = auth.uid()
        )
    );

-- Ensure RLS is enabled on team_members table
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Also fix any potential issues with the teams table RLS for admin operations
DROP POLICY IF EXISTS "Admin can manage all teams" ON public.teams;

CREATE POLICY "Admin can manage all teams" ON public.teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;

-- Refresh the admin_team_stats view to ensure it uses the corrected function
DROP VIEW IF EXISTS public.admin_team_stats;

-- Fixed admin_team_stats view to calculate current_members instead of referencing non-existent column
CREATE VIEW public.admin_team_stats AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.team_leader_id,
    t.max_members,
    COUNT(tm.id) as current_members,  -- Calculate current members by counting team_members
    t.total_points,
    t.total_co2_saved,
    t.is_active,
    t.created_at,
    t.updated_at,
    u.first_name as leader_first_name,
    u.last_name as leader_last_name,
    u.email as leader_email
FROM public.teams t
LEFT JOIN public.users u ON t.team_leader_id = u.id
LEFT JOIN public.team_members tm ON t.id = tm.team_id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.description, t.team_leader_id, t.max_members, 
         t.total_points, t.total_co2_saved, t.is_active, t.created_at, t.updated_at,
         u.first_name, u.last_name, u.email
ORDER BY t.created_at DESC;

-- Recalculate all team stats to ensure consistency
DO $$
DECLARE
    team_record RECORD;
BEGIN
    FOR team_record IN SELECT id FROM public.teams WHERE is_active = true LOOP
        -- Trigger the update function for each team
        UPDATE public.teams SET updated_at = NOW() WHERE id = team_record.id;
    END LOOP;
END $$;
