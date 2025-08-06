-- Add resolved_at column to track exact resolution time
ALTER TABLE tickets ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;

-- Initialize resolved_at for existing resolved tickets
UPDATE tickets 
SET resolved_at = updated_at 
WHERE status = 'resolved' AND resolved_at IS NULL;

-- Create function to automatically set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION set_ticket_resolved_at()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically manage resolved_at
CREATE TRIGGER trigger_set_ticket_resolved_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_resolved_at();

-- Create index for better performance on resolved_at queries
CREATE INDEX idx_tickets_resolved_at ON tickets(resolved_at) WHERE resolved_at IS NOT NULL;