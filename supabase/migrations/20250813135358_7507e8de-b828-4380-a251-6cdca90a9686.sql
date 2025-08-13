-- Correções de Segurança RLS: Implementar Least Privilege para Solicitantes

-- 1. TABELA CONTACTS: Restringir acesso de solicitantes apenas ao próprio registro
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;

-- Políticas para SELECT
CREATE POLICY "Agents can view all contacts"
ON public.contacts
FOR SELECT
USING (
  deleted_at IS NULL AND 
  (is_admin() OR get_current_user_role() = 'support_agent')
);

CREATE POLICY "Requesters can view own contact only"
ON public.contacts
FOR SELECT
USING (
  deleted_at IS NULL AND 
  user_id = auth.uid()
);

-- Políticas para INSERT
CREATE POLICY "Agents can insert contacts"
ON public.contacts
FOR INSERT
WITH CHECK (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can insert own contact only"
ON public.contacts
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Políticas para UPDATE
CREATE POLICY "Agents can update contacts"
ON public.contacts
FOR UPDATE
USING (
  deleted_at IS NULL AND 
  (is_admin() OR get_current_user_role() = 'support_agent')
);

CREATE POLICY "Requesters can update own contact only"
ON public.contacts
FOR UPDATE
USING (
  deleted_at IS NULL AND 
  user_id = auth.uid()
);

-- 2. TABELA COMPANIES: Restringir acesso de solicitantes apenas à empresa vinculada
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;

-- Políticas para SELECT
CREATE POLICY "Agents can view all companies"
ON public.companies
FOR SELECT
USING (
  deleted_at IS NULL AND 
  (is_admin() OR get_current_user_role() = 'support_agent')
);

CREATE POLICY "Requesters can view own company only"
ON public.companies
FOR SELECT
USING (
  deleted_at IS NULL AND 
  id IN (
    SELECT company_id 
    FROM public.contacts 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Políticas para INSERT
CREATE POLICY "Agents can insert companies"
ON public.companies
FOR INSERT
WITH CHECK (is_admin() OR get_current_user_role() = 'support_agent');

-- Políticas para UPDATE
CREATE POLICY "Agents can update companies"
ON public.companies
FOR UPDATE
USING (
  deleted_at IS NULL AND 
  (is_admin() OR get_current_user_role() = 'support_agent')
);

-- 3. TABELA USER_PROFILES: Restringir acesso de solicitantes apenas ao próprio perfil
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

-- Políticas para SELECT
CREATE POLICY "Agents can view all profiles"
ON public.user_profiles
FOR SELECT
USING (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can view own profile only"
ON public.user_profiles
FOR SELECT
USING (user_id = auth.uid());

-- 4. TABELA TICKET_MESSAGES: Substituir política ALL por políticas específicas
DROP POLICY IF EXISTS "Authenticated users can manage messages" ON public.ticket_messages;

-- Políticas para SELECT
CREATE POLICY "Agents can view all messages"
ON public.ticket_messages
FOR SELECT
USING (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can view messages from own tickets"
ON public.ticket_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE (created_by = auth.uid() OR contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )) AND deleted_at IS NULL
  )
);

-- Políticas para INSERT
CREATE POLICY "Agents can insert messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can insert messages on own tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE (created_by = auth.uid() OR contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )) AND deleted_at IS NULL
  )
);

-- Políticas para UPDATE
CREATE POLICY "Agents can update messages"
ON public.ticket_messages
FOR UPDATE
USING (is_admin() OR get_current_user_role() = 'support_agent');

-- Políticas para DELETE
CREATE POLICY "Agents can delete messages"
ON public.ticket_messages
FOR DELETE
USING (is_admin() OR get_current_user_role() = 'support_agent');

-- 5. TABELA TICKET_ATTACHMENTS: Substituir política ALL por políticas específicas
DROP POLICY IF EXISTS "Authenticated users can manage attachments" ON public.ticket_attachments;

-- Políticas para SELECT
CREATE POLICY "Agents can view all attachments"
ON public.ticket_attachments
FOR SELECT
USING (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can view attachments from own tickets"
ON public.ticket_attachments
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE (created_by = auth.uid() OR contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )) AND deleted_at IS NULL
  )
);

-- Políticas para INSERT
CREATE POLICY "Agents can insert attachments"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can insert attachments on own tickets"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE (created_by = auth.uid() OR contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )) AND deleted_at IS NULL
  )
);

-- Políticas para UPDATE
CREATE POLICY "Agents can update attachments"
ON public.ticket_attachments
FOR UPDATE
USING (is_admin() OR get_current_user_role() = 'support_agent');

-- Políticas para DELETE
CREATE POLICY "Agents can delete attachments"
ON public.ticket_attachments
FOR DELETE
USING (is_admin() OR get_current_user_role() = 'support_agent');