-- Create equipment_models table
CREATE TABLE public.equipment_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment_models ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view equipment models" 
ON public.equipment_models 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create equipment models" 
ON public.equipment_models 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment models" 
ON public.equipment_models 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete equipment models" 
ON public.equipment_models 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_equipment_models_updated_at
BEFORE UPDATE ON public.equipment_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial equipment models
INSERT INTO public.equipment_models (name, manufacturer, category) VALUES
  ('Model A100', 'Nortek', 'Sensor'),
  ('Model B200', 'Nortek', 'Controller'),
  ('Model C300', 'Nortek', 'Gateway'),
  ('Model D400', 'Generic', 'Sensor'),
  ('Model E500', 'Generic', 'Controller');