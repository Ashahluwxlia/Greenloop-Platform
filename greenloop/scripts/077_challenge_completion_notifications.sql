-- Add notification triggers for challenge completion
-- This script adds notification functionality to the existing challenge completion system

-- Update the challenge completion rewards function to include notifications
CREATE OR REPLACE FUNCTION award_challenge_completion_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    challenge_record RECORD;
    team_member_record RECORD;
    reward_points INTEGER;
BEGIN
    -- Only process when a challenge is being marked as completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        
        -- Get challenge details
        SELECT * INTO challenge_record
        FROM challenges 
        WHERE id = NEW.challenge_id;
        
        -- Only award points if challenge has reward points
        IF challenge_record.reward_points > 0 THEN
            
            CASE challenge_record.challenge_type
                WHEN 'individual' THEN
                    -- Individual challenges don't get reward points (already enforced in validation)
                    -- This case should never happen due to validation, but included for completeness
                    NULL;
                    
                WHEN 'team' THEN
                    -- Award points to all team members who participated in the challenge
                    FOR team_member_record IN
                        SELECT DISTINCT cp.user_id
                        FROM challenge_participants cp
                        WHERE cp.challenge_id = NEW.challenge_id
                        AND cp.user_id IS NOT NULL
                        AND cp.completed = true
                    LOOP
                        -- Create point transaction for each team member
                        INSERT INTO point_transactions (
                            user_id,
                            points,
                            transaction_type,
                            description,
                            reference_id,
                            reference_type
                        ) VALUES (
                            team_member_record.user_id,
                            challenge_record.reward_points,
                            'challenge_reward',
                            format('Completed team challenge: %s', challenge_record.title),
                            challenge_record.id,
                            'challenge'
                        );
                        
                        -- Create notification for challenge completion
                        PERFORM create_notification(
                            team_member_record.user_id,
                            'challenge_progress',
                            'Challenge Completed! 🎉',
                            format('Challenge completed! You earned %s points from ''%s''', challenge_record.reward_points, challenge_record.title),
                            '/challenges',
                            'challenge',
                            challenge_record.id::text
                        );
                        
                        RAISE NOTICE 'Awarded % points to user % for completing team challenge %', 
                            challenge_record.reward_points, team_member_record.user_id, challenge_record.title;
                    END LOOP;
                    
                WHEN 'company' THEN
                    -- Award points to the individual user who completed the company challenge
                    INSERT INTO point_transactions (
                        user_id,
                        points,
                        transaction_type,
                        description,
                        reference_id,
                        reference_type
                    ) VALUES (
                        NEW.user_id,
                        challenge_record.reward_points,
                        'challenge_reward',
                        format('Completed company challenge: %s', challenge_record.title),
                        challenge_record.id,
                        'challenge'
                    );
                    
                    -- Create notification for challenge completion
                    PERFORM create_notification(
                        NEW.user_id,
                        'challenge_progress',
                        'Challenge Completed! 🎉',
                        format('Challenge completed! You earned %s points from ''%s''', challenge_record.reward_points, challenge_record.title),
                        '/challenges',
                        'challenge',
                        challenge_record.id::text
                    );
                    
                    RAISE NOTICE 'Awarded % points to user % for completing company challenge %', 
                        challenge_record.reward_points, NEW.user_id, challenge_record.title;
                        
            END CASE;
            
        ELSE
            -- Even if no reward points, still send completion notification
            IF challenge_record.challenge_type = 'individual' THEN
                PERFORM create_notification(
                    NEW.user_id,
                    'challenge_progress',
                    'Challenge Completed! 🎉',
                    format('Congratulations! You completed ''%s''', challenge_record.title),
                    '/challenges',
                    'challenge',
                    challenge_record.id::text
                );
            ELSIF challenge_record.challenge_type = 'team' THEN
                -- Send notification to all team members who completed
                FOR team_member_record IN
                    SELECT DISTINCT cp.user_id
                    FROM challenge_participants cp
                    WHERE cp.challenge_id = NEW.challenge_id
                    AND cp.user_id IS NOT NULL
                    AND cp.completed = true
                LOOP
                    PERFORM create_notification(
                        team_member_record.user_id,
                        'challenge_progress',
                        'Challenge Completed! 🎉',
                        format('Congratulations! Your team completed ''%s''', challenge_record.title),
                        '/challenges',
                        'challenge',
                        challenge_record.id::text
                    );
                END LOOP;
            ELSIF challenge_record.challenge_type = 'company' THEN
                PERFORM create_notification(
                    NEW.user_id,
                    'challenge_progress',
                    'Challenge Completed! 🎉',
                    format('Congratulations! You completed the company challenge ''%s''', challenge_record.title),
                    '/challenges',
                    'challenge',
                    challenge_record.id::text
                );
            END IF;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- The triggers are already created in the previous script, so no need to recreate them
-- DROP TRIGGER IF EXISTS award_challenge_rewards_trigger ON challenge_participants;
-- CREATE TRIGGER award_challenge_rewards_trigger
--     AFTER UPDATE ON challenge_participants
--     FOR EACH ROW
--     EXECUTE FUNCTION award_challenge_completion_rewards();

-- DROP TRIGGER IF EXISTS award_challenge_rewards_progress_trigger ON challenge_progress;
-- CREATE TRIGGER award_challenge_rewards_progress_trigger
--     AFTER UPDATE ON challenge_progress
--     FOR EACH ROW
--     EXECUTE FUNCTION award_challenge_completion_rewards();
