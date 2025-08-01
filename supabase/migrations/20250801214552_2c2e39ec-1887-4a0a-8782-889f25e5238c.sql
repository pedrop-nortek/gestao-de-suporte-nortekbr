-- Add cumulative log field to tickets table
ALTER TABLE public.tickets 
ADD COLUMN ticket_log TEXT DEFAULT '';

-- Create RMA requests table
CREATE TABLE public.rma_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  rma_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create RMA steps table
CREATE TABLE public.rma_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_id UUID NOT NULL REFERENCES public.rma_requests(id) ON DELETE CASCADE,
  step_name VARCHAR(100) NOT NULL,
  step_order INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  functionality_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.rma_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rma_steps ENABLE ROW LEVEL SECURITY;

-- RMA requests policies
CREATE POLICY "Authenticated users can view RMA requests" 
ON public.rma_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create RMA requests" 
ON public.rma_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update RMA requests" 
ON public.rma_requests 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete RMA requests" 
ON public.rma_requests 
FOR DELETE 
USING (true);

-- RMA steps policies
CREATE POLICY "Authenticated users can view RMA steps" 
ON public.rma_steps 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create RMA steps" 
ON public.rma_steps 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update RMA steps" 
ON public.rma_steps 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete RMA steps" 
ON public.rma_steps 
FOR DELETE 
USING (true);

-- Create trigger for RMA requests updated_at
CREATE TRIGGER update_rma_requests_updated_at
BEFORE UPDATE ON public.rma_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default RMA steps for each new RMA
CREATE OR REPLACE FUNCTION public.create_default_rma_steps()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.rma_steps (rma_id, step_name, step_order) VALUES
    (NEW.id, 'Recebimento do número RMA', 1),
    (NEW.id, 'Envio do equipamento para Noruega', 2),
    (NEW.id, 'Início da avaliação inicial', 3),
    (NEW.id, 'Emissão do diagnóstico/orçamento preliminar', 4),
    (NEW.id, 'Aprovação pelo cliente', 5),
    (NEW.id, 'Início do reparo', 6),
    (NEW.id, 'Envio de volta para cliente', 7),
    (NEW.id, 'Recebimento pelo cliente', 8),
    (NEW.id, 'Equipamento funcional após reparo', 9);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create RMA steps
CREATE TRIGGER create_rma_steps_trigger
AFTER INSERT ON public.rma_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_default_rma_steps();