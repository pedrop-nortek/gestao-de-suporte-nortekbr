-- Add contact_id column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN contact_id UUID REFERENCES public.contacts(id);

-- Add index for better performance on contact lookups
CREATE INDEX idx_tickets_contact_id ON public.tickets(contact_id);