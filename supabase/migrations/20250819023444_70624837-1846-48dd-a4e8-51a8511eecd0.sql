-- Permitir que requesters vejam todas as empresas para seleção no autocomplete
-- Isso é necessário para que possam escolher uma empresa para se vincular

DROP POLICY IF EXISTS "Requesters can view own company only" ON public.companies;

CREATE POLICY "Requesters can view all companies for selection" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (deleted_at IS NULL);