-- Fix security issue: Set search_path for the function
CREATE OR REPLACE FUNCTION set_ticket_resolved_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If status is changing to 'resolved' and resolved_at is not set
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;
  
  -- If status is changing from 'resolved' to something else, clear resolved_at
  IF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
    NEW.resolved_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;