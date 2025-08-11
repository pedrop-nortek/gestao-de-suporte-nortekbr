
-- 1) Adicionar País e Website em empresas
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS website text;

COMMENT ON COLUMN public.companies.country IS 'País de atuação principal da empresa (livre texto, ex: BR, Brasil, Norway, etc.)';
COMMENT ON COLUMN public.companies.website IS 'Website da empresa (URL)';

-- 2) Adicionar País em tickets (permite override do país da empresa)
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS country text;

COMMENT ON COLUMN public.tickets.country IS 'País associado ao ticket. Por padrão, usar o country da empresa selecionada, mas pode ser ajustado caso a empresa atue em múltiplos países.';
