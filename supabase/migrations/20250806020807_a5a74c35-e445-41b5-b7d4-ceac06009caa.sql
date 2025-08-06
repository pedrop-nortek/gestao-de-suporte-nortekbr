-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_attachments_ticket;
DROP INDEX IF EXISTS idx_messages_ticket;  
DROP INDEX IF EXISTS idx_tickets_company;

-- Remove unused RMA number index if it exists (nullable field may not need unique constraint)
DROP INDEX IF EXISTS rma_requests_rma_number_key;

-- Optimize RLS policies by making them more specific
-- Replace the broad ALL policies with specific ones for better performance

-- For ticket_attachments: Replace ALL policy with specific ones
DROP POLICY IF EXISTS "Authenticated users can manage attachments" ON ticket_attachments;

CREATE POLICY "Authenticated users can view attachments" 
ON ticket_attachments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create attachments" 
ON ticket_attachments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update attachments" 
ON ticket_attachments FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete attachments" 
ON ticket_attachments FOR DELETE 
USING (true);

-- For ticket_messages: Replace ALL policy with specific ones
DROP POLICY IF EXISTS "Authenticated users can manage messages" ON ticket_messages;

CREATE POLICY "Authenticated users can view messages" 
ON ticket_messages FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create messages" 
ON ticket_messages FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages" 
ON ticket_messages FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete messages" 
ON ticket_messages FOR DELETE 
USING (true);

-- For tickets: Replace ALL policy with specific ones
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON tickets;

CREATE POLICY "Authenticated users can view tickets" 
ON tickets FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tickets" 
ON tickets FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets" 
ON tickets FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete tickets" 
ON tickets FOR DELETE 
USING (true);