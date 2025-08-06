-- Remove duplicate indexes (keeping the most used ones)

-- Remove duplicate index for ticket_attachments.ticket_id (keep idx_attachments_ticket with 16 scans)
DROP INDEX IF EXISTS idx_ticket_attachments_ticket_id;

-- Remove duplicate index for ticket_messages.ticket_id (keep idx_messages_ticket with 185 scans)  
DROP INDEX IF EXISTS idx_ticket_messages_ticket_id;

-- Remove duplicate index for tickets.company_id (keep idx_tickets_company with 1 scan)
DROP INDEX IF EXISTS idx_tickets_company_id;

-- Remove duplicate index for tickets.ticket_number (keep unique constraint, remove redundant index)
DROP INDEX IF EXISTS idx_tickets_number;

-- Remove unused indexes with 0 scans that are not essential
DROP INDEX IF EXISTS idx_contacts_company;
DROP INDEX IF EXISTS idx_contacts_email;
DROP INDEX IF EXISTS idx_contacts_phone;
DROP INDEX IF EXISTS idx_equipment_models_category;
DROP INDEX IF EXISTS idx_equipment_models_manufacturer;
DROP INDEX IF EXISTS idx_equipment_models_name;
DROP INDEX IF EXISTS idx_rma_requests_created_by;
DROP INDEX IF EXISTS idx_rma_requests_status;
DROP INDEX IF EXISTS idx_rma_requests_ticket;
DROP INDEX IF EXISTS idx_rma_steps_completed_by;
DROP INDEX IF EXISTS idx_rma_steps_rma;
DROP INDEX IF EXISTS idx_ticket_attachments_created_by;
DROP INDEX IF EXISTS idx_ticket_attachments_file_type;
DROP INDEX IF EXISTS idx_ticket_messages_channel;
DROP INDEX IF EXISTS idx_ticket_messages_created_by;
DROP INDEX IF EXISTS idx_ticket_messages_external_id;
DROP INDEX IF EXISTS idx_ticket_messages_sender_type;
DROP INDEX IF EXISTS idx_tickets_assigned_to;
DROP INDEX IF EXISTS idx_tickets_category;
DROP INDEX IF EXISTS idx_tickets_channel;
DROP INDEX IF EXISTS idx_tickets_contact;
DROP INDEX IF EXISTS idx_tickets_created_by;
DROP INDEX IF EXISTS idx_tickets_equipment_model;
DROP INDEX IF EXISTS idx_tickets_priority;
DROP INDEX IF EXISTS idx_tickets_responsibility;
DROP INDEX IF EXISTS idx_tickets_serial_number;
DROP INDEX IF EXISTS idx_tickets_status;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_user_profiles_user;
DROP INDEX IF EXISTS idx_user_settings_user;

-- Remove the unused unique constraint on rma_number (since field is nullable)
ALTER TABLE rma_requests DROP CONSTRAINT IF EXISTS rma_requests_rma_number_key;