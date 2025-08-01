-- Add assigned_to field to tickets table to track who is responsible for each ticket
ALTER TABLE public.tickets 
ADD COLUMN assigned_to UUID REFERENCES public.user_profiles(user_id);

-- Add comment to clarify the field purpose
COMMENT ON COLUMN public.tickets.assigned_to IS 'User assigned to handle this ticket';