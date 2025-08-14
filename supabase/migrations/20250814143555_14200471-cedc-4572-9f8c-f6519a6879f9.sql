-- Drop existing overly permissive RLS policies for rma_requests
DROP POLICY IF EXISTS "Authenticated users can view rma requests" ON public.rma_requests;
DROP POLICY IF EXISTS "Authenticated users can insert rma requests" ON public.rma_requests;
DROP POLICY IF EXISTS "Authenticated users can update rma requests" ON public.rma_requests;

-- Create restrictive RLS policies for rma_requests
CREATE POLICY "Agents can view all rma requests" 
ON public.rma_requests 
FOR SELECT 
USING (
  deleted_at IS NULL 
  AND (is_admin() OR get_current_user_role() = 'support_agent')
);

CREATE POLICY "Requesters can view own rma requests" 
ON public.rma_requests 
FOR SELECT 
USING (
  deleted_at IS NULL 
  AND ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE deleted_at IS NULL 
    AND (
      created_by = auth.uid() 
      OR contact_id IN (
        SELECT id FROM public.contacts 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "Agents can insert rma requests" 
ON public.rma_requests 
FOR INSERT 
WITH CHECK (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Requesters can insert rma requests for own tickets" 
ON public.rma_requests 
FOR INSERT 
WITH CHECK (
  ticket_id IN (
    SELECT id FROM public.tickets 
    WHERE deleted_at IS NULL 
    AND (
      created_by = auth.uid() 
      OR contact_id IN (
        SELECT id FROM public.contacts 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "Agents can update rma requests" 
ON public.rma_requests 
FOR UPDATE 
USING (
  deleted_at IS NULL 
  AND (is_admin() OR get_current_user_role() = 'support_agent')
);

-- Drop existing overly permissive RLS policies for rma_steps
DROP POLICY IF EXISTS "Authenticated users can view rma steps" ON public.rma_steps;
DROP POLICY IF EXISTS "Authenticated users can insert rma steps" ON public.rma_steps;
DROP POLICY IF EXISTS "Authenticated users can update rma steps" ON public.rma_steps;

-- Create restrictive RLS policies for rma_steps
CREATE POLICY "Agents can view all rma steps" 
ON public.rma_steps 
FOR SELECT 
USING (
  deleted_at IS NULL 
  AND (is_admin() OR get_current_user_role() = 'support_agent')
);

CREATE POLICY "Requesters can view own rma steps" 
ON public.rma_steps 
FOR SELECT 
USING (
  deleted_at IS NULL 
  AND rma_id IN (
    SELECT rr.id FROM public.rma_requests rr
    JOIN public.tickets t ON rr.ticket_id = t.id
    WHERE rr.deleted_at IS NULL 
    AND t.deleted_at IS NULL
    AND (
      t.created_by = auth.uid() 
      OR t.contact_id IN (
        SELECT id FROM public.contacts 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "Agents can insert rma steps" 
ON public.rma_steps 
FOR INSERT 
WITH CHECK (is_admin() OR get_current_user_role() = 'support_agent');

CREATE POLICY "Agents can update rma steps" 
ON public.rma_steps 
FOR UPDATE 
USING (
  deleted_at IS NULL 
  AND (is_admin() OR get_current_user_role() = 'support_agent')
);