-- Migration: Appointment Status Enhancement
-- Date: 2026-02-15
-- Purpose: Add status labels for appointments with auto-confirmation logic
-- Fixed: Execute data migration BEFORE adding constraint

-- Step 1: Add confirmed_at column to track confirmation time
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Step 2: Drop existing constraint FIRST
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Step 3: Migrate existing data BEFORE adding new constraint
-- Change 'scheduled' to 'pending' for consistency
UPDATE public.appointments 
SET status = 'pending' 
WHERE status = 'scheduled';

-- Handle any other unexpected status values (set to 'pending' as fallback)
UPDATE public.appointments 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked');

-- Set confirmed_at for existing confirmed appointments
UPDATE public.appointments 
SET confirmed_at = updated_at 
WHERE status = 'confirmed' AND confirmed_at IS NULL;

-- Step 4: Add new constraint AFTER data migration
-- Status flow: pending -> confirmed -> completed | cancelled | no_show
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked'));

-- Step 5: Create function to auto-confirm appointments after 12 hours
CREATE OR REPLACE FUNCTION public.auto_confirm_appointments()
RETURNS void AS $$
BEGIN
  UPDATE public.appointments
  SET 
    status = 'confirmed',
    confirmed_at = NOW()
  WHERE status = 'pending'
    AND start_time > NOW()
    AND created_at < NOW() - INTERVAL '12 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to prevent status regression
-- (confirmed cannot go back to pending)
CREATE OR REPLACE FUNCTION public.prevent_status_regression()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing from 'confirmed' to 'pending', block it
  IF OLD.status = 'confirmed' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'Cannot change status from confirmed back to pending';
  END IF;
  
  -- If status is changing to 'confirmed', set confirmed_at
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for status regression prevention
DROP TRIGGER IF EXISTS prevent_status_regression_trigger ON public.appointments;
CREATE TRIGGER prevent_status_regression_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_status_regression();

-- Step 8: Create index for efficient auto-confirmation queries
CREATE INDEX IF NOT EXISTS idx_appointments_auto_confirm 
ON public.appointments(status, created_at, start_time) 
WHERE status = 'pending';

-- Comments
COMMENT ON COLUMN public.appointments.confirmed_at IS 'Timestamp when appointment was confirmed. Set automatically when status changes to confirmed.';
COMMENT ON FUNCTION public.auto_confirm_appointments() IS 'Auto-confirms pending appointments created more than 12 hours ago';
COMMENT ON FUNCTION public.prevent_status_regression() IS 'Prevents changing status from confirmed back to pending';
