-- Create security definer functions to safely check user roles and permissions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT public.get_current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.can_access_company(company_uuid uuid)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE company_id = company_uuid 
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  ) OR public.is_admin();
$$;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;

-- Create secure company policies
CREATE POLICY "Users can view accessible companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (public.can_access_company(id) OR public.is_admin());

CREATE POLICY "Admins can insert companies" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update companies" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete companies" 
ON public.companies 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Drop existing contact policies
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

-- Create secure contact policies
CREATE POLICY "Users can view contacts from accessible companies" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (public.can_access_company(company_id) OR public.is_admin());

CREATE POLICY "Users can create contacts for accessible companies" 
ON public.contacts 
FOR INSERT 
TO authenticated
WITH CHECK (public.can_access_company(company_id) OR public.is_admin());

CREATE POLICY "Users can update contacts from accessible companies" 
ON public.contacts 
FOR UPDATE 
TO authenticated
USING (public.can_access_company(company_id) OR public.is_admin());

CREATE POLICY "Users can delete contacts from accessible companies" 
ON public.contacts 
FOR DELETE 
TO authenticated
USING (public.can_access_company(company_id) OR public.is_admin());

-- Drop existing ticket policies
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON public.tickets;

-- Create secure ticket policies
CREATE POLICY "Users can view their tickets or assigned tickets" 
ON public.tickets 
FOR SELECT 
TO authenticated
USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create tickets" 
ON public.tickets 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their tickets or assigned tickets" 
ON public.tickets 
FOR UPDATE 
TO authenticated
USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can delete tickets" 
ON public.tickets 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Drop existing user profile policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create secure user profile policies
CREATE POLICY "Users can view all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND 
  -- Prevent users from changing their own role unless they're admin
  (role = OLD.role OR public.is_admin())
);

-- Create secure equipment model policies
DROP POLICY IF EXISTS "Authenticated users can view equipment models" ON public.equipment_models;
DROP POLICY IF EXISTS "Authenticated users can create equipment models" ON public.equipment_models;
DROP POLICY IF EXISTS "Authenticated users can update equipment models" ON public.equipment_models;
DROP POLICY IF EXISTS "Authenticated users can delete equipment models" ON public.equipment_models;

CREATE POLICY "Users can view equipment models" 
ON public.equipment_models 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage equipment models" 
ON public.equipment_models 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create secure RMA policies
DROP POLICY IF EXISTS "Authenticated users can view RMA requests" ON public.rma_requests;
DROP POLICY IF EXISTS "Authenticated users can create RMA requests" ON public.rma_requests;
DROP POLICY IF EXISTS "Authenticated users can update RMA requests" ON public.rma_requests;
DROP POLICY IF EXISTS "Authenticated users can delete RMA requests" ON public.rma_requests;

CREATE POLICY "Users can view RMA requests for their tickets" 
ON public.rma_requests 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = ticket_id 
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  ) OR public.is_admin()
);

CREATE POLICY "Users can create RMA requests for their tickets" 
ON public.rma_requests 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = ticket_id 
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  ) OR public.is_admin()
);

CREATE POLICY "Users can update RMA requests for their tickets" 
ON public.rma_requests 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = ticket_id 
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  ) OR public.is_admin()
);

CREATE POLICY "Admins can delete RMA requests" 
ON public.rma_requests 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Create secure RMA steps policies
DROP POLICY IF EXISTS "Authenticated users can view RMA steps" ON public.rma_steps;
DROP POLICY IF EXISTS "Authenticated users can create RMA steps" ON public.rma_steps;
DROP POLICY IF EXISTS "Authenticated users can update RMA steps" ON public.rma_steps;
DROP POLICY IF EXISTS "Authenticated users can delete RMA steps" ON public.rma_steps;

CREATE POLICY "Users can view RMA steps for accessible RMAs" 
ON public.rma_steps 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rma_requests r
    JOIN public.tickets t ON r.ticket_id = t.id
    WHERE r.id = rma_id 
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
  ) OR public.is_admin()
);

CREATE POLICY "Users can update RMA steps for accessible RMAs" 
ON public.rma_steps 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rma_requests r
    JOIN public.tickets t ON r.ticket_id = t.id
    WHERE r.id = rma_id 
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
  ) OR public.is_admin()
);

CREATE POLICY "System can create RMA steps" 
ON public.rma_steps 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can delete RMA steps" 
ON public.rma_steps 
FOR DELETE 
TO authenticated
USING (public.is_admin());