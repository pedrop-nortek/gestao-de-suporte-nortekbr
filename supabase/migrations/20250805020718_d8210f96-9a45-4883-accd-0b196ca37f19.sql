-- Remove redundant RLS policies
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON ticket_attachments;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON ticket_messages;  
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON tickets;

-- Create indexes for foreign keys to improve performance
CREATE INDEX IF NOT EXISTS idx_rma_requests_ticket_id ON rma_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rma_requests_created_by ON rma_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_rma_steps_rma_id ON rma_steps(rma_id);
CREATE INDEX IF NOT EXISTS idx_rma_steps_completed_by ON rma_steps(completed_by);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_company_id ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_contact_id ON tickets(contact_id);
CREATE INDEX IF NOT EXISTS idx_tickets_equipment_model_id ON tickets(equipment_model_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_by ON ticket_messages(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_created_by ON ticket_attachments(created_by);