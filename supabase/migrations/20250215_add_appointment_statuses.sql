-- 1. Update/Add check constraint for appointments status
-- We first try to drop the likely existing constraint name. 
-- If the name is unknown, this might fail, so we use a DO block or just try standard names.
-- Since we are in an environment where we can just run SQL, we'll try to be robust.

DO $$
BEGIN
    -- Try to drop constraint if it exists (guessing common names)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check') THEN
        ALTER TABLE appointments DROP CONSTRAINT appointments_status_check;
    END IF;
END $$;

-- Add the new constraint
ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('booked', 'confirmed', 'cancelled', 'noshow', 'completed', 'blocked', 'pending_deposit'));

-- 2. Create function to auto-confirm appointments
CREATE OR REPLACE FUNCTION auto_confirm_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE appointments
    SET status = 'confirmed',
        updated_at = NOW()
    WHERE status = 'booked'
      AND created_at < (NOW() - INTERVAL '12 hours');
END;
$$;

-- 3. (Optional) Create a trigger to run this function? 
-- Triggers run on events. We can't trigger on "time passing".
-- Ideally, we use pg_cron.
-- Check if pg_cron is available: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- If not, we rely on the application calling this function, OR we attach it to some other frequent event (bad practice but works for prototypes).
-- For now, we just define the function. The frontend can call it via rpc('auto_confirm_appointments') on admin page load.

-- 4. Comment on columns for clarity
COMMENT ON COLUMN appointments.status IS 'Status: booked, confirmed, cancelled, noshow, completed, blocked, pending_deposit';
