-- Step 1: Add new enum values to ticket_status
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending'; 
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'unresolved';