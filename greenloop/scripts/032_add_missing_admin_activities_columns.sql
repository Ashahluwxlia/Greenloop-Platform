-- Add missing columns to existing admin_activities table
-- Adding only the missing columns without recreating table or policies

ALTER TABLE admin_activities 
ADD COLUMN IF NOT EXISTS details JSONB,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update the table comment
COMMENT ON TABLE admin_activities IS 'Tracks all administrative activities for audit purposes';
COMMENT ON COLUMN admin_activities.details IS 'Additional structured data about the activity';
COMMENT ON COLUMN admin_activities.ip_address IS 'IP address of the admin performing the action';
COMMENT ON COLUMN admin_activities.user_agent IS 'User agent string of the admin browser';
