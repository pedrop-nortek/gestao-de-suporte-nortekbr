
-- 1) Garantias em perfis de usuário e papel padrão para novos usuários
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_unique
  ON public.user_profiles (user_id);

ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'requester';

-- Impedir mudança de role por usuários não-admin (evita escalonamento)
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_admin() AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- Mantém o role original para não-admins
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.user_profiles;

CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();


-- 2) Vincular contato ao usuário (sem FK no schema auth; referenciando profiles)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Um usuário só pode estar vinculado a um contato (1:1)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_id_unique
  ON public.contacts (user_id) WHERE user_id IS NOT NULL;

-- FK para user_profiles.user_id (torna possível o JOIN e mantém boas práticas)
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
  ON UPDATE CASCADE ON DELETE SET NULL;


-- 3) RPC: Upsert de empresas por nome+país (e website se informado)
CREATE OR REPLACE FUNCTION public.upsert_company_by_name_country(
  _name text,
  _country text,
  _website text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- tentar casar por website (case-insensitive), se informado
  IF _website IS NOT NULL AND LENGTH(TRIM(_website)) > 0 THEN
    SELECT id INTO v_id
    FROM public.companies
    WHERE lower(coalesce(website,'')) = lower(TRIM(_website))
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  -- tentar casar por nome+país (case-insensitive)
  SELECT id INTO v_id
  FROM public.companies
  WHERE lower(name) = lower(TRIM(_name))
    AND lower(coalesce(country,'')) = lower(coalesce(TRIM(_country), ''))
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- se website veio e a empresa não tem, preenche
    IF _website IS NOT NULL AND LENGTH(TRIM(_website)) > 0 THEN
      UPDATE public.companies
      SET website = COALESCE(website, TRIM(_website))
      WHERE id = v_id;
    END IF;

    RETURN v_id;
  END IF;

  INSERT INTO public.companies (name, country, website)
  VALUES (TRIM(_name), NULLIF(TRIM(_country), ''), NULLIF(TRIM(_website), ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- 4) RPC: Garante/atualiza o contato do usuário logado e o vincula à empresa
CREATE OR REPLACE FUNCTION public.ensure_contact_for_current_user(
  _company_id uuid,
  _name text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.contacts WHERE user_id = auth.uid();

  IF v_id IS NOT NULL THEN
    UPDATE public.contacts
    SET name = COALESCE(NULLIF(TRIM(_name),''), name),
        email = COALESCE(NULLIF(TRIM(_email),''), email),
        phone = COALESCE(NULLIF(TRIM(_phone),''), phone),
        company_id = COALESCE(_company_id, company_id),
        updated_at = now()
    WHERE id = v_id;

    RETURN v_id;
  END IF;

  INSERT INTO public.contacts (company_id, name, email, phone, user_id)
  VALUES (_company_id, COALESCE(NULLIF(TRIM(_name),''), 'Solicitante'), NULLIF(TRIM(_email),''), NULLIF(TRIM(_phone),''), auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- 5) RLS dos tickets: restringir solicitantes e manter acesso de agentes/admin

-- Remover políticas permissivas atuais
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.tickets;

-- Visualização
CREATE POLICY "Agents can view tickets"
  ON public.tickets
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (public.is_admin() OR public.get_current_user_role() = 'support_agent')
  );

CREATE POLICY "Requesters can view own tickets"
  ON public.tickets
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid())
    )
  );

-- Criação
CREATE POLICY "Agents can insert tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (
    public.is_admin() OR public.get_current_user_role() = 'support_agent'
  );

CREATE POLICY "Requesters can insert own tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid())
    AND company_id IS NOT NULL
    AND (
      contact_id IS NULL OR
      company_id = (SELECT company_id FROM public.contacts c WHERE c.id = contact_id)
    )
  );

-- Atualização
CREATE POLICY "Agents can update tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (public.is_admin() OR public.get_current_user_role() = 'support_agent')
  );


-- 6) Impedir solicitantes de criarem/alterarem modelos de equipamento
DROP POLICY IF EXISTS "Authenticated users can insert equipment models" ON public.equipment_models;
DROP POLICY IF EXISTS "Authenticated users can update equipment models" ON public.equipment_models;

CREATE POLICY "Agents can insert equipment models"
  ON public.equipment_models
  FOR INSERT
  WITH CHECK (
    public.is_admin() OR public.get_current_user_role() = 'support_agent'
  );

CREATE POLICY "Agents can update equipment models"
  ON public.equipment_models
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (public.is_admin() OR public.get_current_user_role() = 'support_agent')
  );
