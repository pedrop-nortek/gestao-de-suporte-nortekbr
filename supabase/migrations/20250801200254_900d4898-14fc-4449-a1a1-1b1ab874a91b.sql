-- Add equipment_model_id column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN equipment_model_id UUID;

-- Add foreign key constraint with cascade updates
ALTER TABLE public.tickets 
ADD CONSTRAINT fk_tickets_equipment_model 
FOREIGN KEY (equipment_model_id) 
REFERENCES public.equipment_models(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Migrate existing data by matching equipment names
UPDATE public.tickets 
SET equipment_model_id = em.id
FROM public.equipment_models em
WHERE tickets.equipment_model = em.name
AND tickets.equipment_model IS NOT NULL
AND tickets.equipment_model != '';

-- Create index for better performance
CREATE INDEX idx_tickets_equipment_model_id ON public.tickets(equipment_model_id);

-- Update tickets that don't have a match to NULL
UPDATE public.tickets 
SET equipment_model_id = NULL
WHERE equipment_model_id IS NULL 
AND equipment_model IS NOT NULL 
AND equipment_model != '';