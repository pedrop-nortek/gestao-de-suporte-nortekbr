-- Add RLS policy to allow requesters to soft delete their own tickets
CREATE POLICY "Requesters can soft delete own tickets" 
ON public.tickets 
FOR ALL 
USING (
  deleted_at IS NULL 
  AND (
    created_by = auth.uid() 
    OR contact_id IN (
      SELECT id FROM public.contacts 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);