-- Add missing values to ticket_status enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending_customer';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'resolved';