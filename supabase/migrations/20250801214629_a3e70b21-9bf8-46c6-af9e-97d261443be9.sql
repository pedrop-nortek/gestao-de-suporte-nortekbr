-- Fix function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';