-- Update ticket status enum values to match new requirements

-- First, let's add the new values to the enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending'; 
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'unresolved';

-- Update existing tickets to use new status values
UPDATE tickets SET status = 'new' WHERE status = 'open';
UPDATE tickets SET status = 'open' WHERE status = 'in_progress';
UPDATE tickets SET status = 'pending' WHERE status = 'pending_customer';
UPDATE tickets SET status = 'unresolved' WHERE status = 'closed';

-- Note: 'resolved' stays the same