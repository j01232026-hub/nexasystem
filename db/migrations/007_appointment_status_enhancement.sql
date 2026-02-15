-- Migration: Appointment Status Enhancement
-- Date: 2026-02-15
-- Purpose: Add status labels for appointments with auto-confirmation logic

-- Step 1: Add confirmed_at column to track confirmation time
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Step 2: Update status constraint to use new status values
-- First drop existing constraint
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add new constraint with updated status values
-- Status flow: pending -> confirmed -> completed | cancelled | no_show
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked'));

-- Step 3: Create function to auto-confirm appointments after 12 hours
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

-- Step 4: Create function to prevent status regression
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

-- Step 5: Create trigger for status regression prevention
DROP TRIGGER IF EXISTS prevent_status_regression_trigger ON public.appointments;
CREATE TRIGGER prevent_status_regression_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_status_regression();

-- Step 6: Create index for efficient auto-confirmation queries
CREATE INDEX IF NOT EXISTS idx_appointments_auto_confirm 
ON public.appointments(status, created_at, start_time) 
WHERE status = 'pending';

-- Step 7: Migrate existing data
-- Change 'scheduled' to 'pending' for consistency
UPDATE public.appointments 
SET status = 'pending' 
WHERE status = 'scheduled';

-- Set confirmed_at for existing confirmed appointments
UPDATE public.appointments 
SET confirmed_at = updated_at 
WHERE status = 'confirmed' AND confirmed_at IS NULL;

-- Comment on new column
COMMENT ON COLUMN public.appointments.confirmed_at IS 'Timestamp when appointment was confirmed. Set automatically when status changes to confirmed.';
COMMENT ON FUNCTION public.auto_confirm_appointments() IS 'Auto-confirms pending appointments created more than 12 hours ago';
COMMENT ON FUNCTION public.prevent_status_regression() IS 'Prevents changing status from confirmed back to pending';
