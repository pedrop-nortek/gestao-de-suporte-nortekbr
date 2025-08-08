-- Soft delete + permissive RLS for internal use (companies, contacts)

-- 1) Columns for soft delete
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 2) Keep updated_at fresh on update
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RLS policies: allow all authenticated users to view/insert/update active rows; block hard delete
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing companies policies
DROP POLICY IF EXISTS "Users can view accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;

-- Create permissive companies policies
CREATE POLICY "Authenticated users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL);

-- No DELETE policy => hard deletes remain blocked

-- Drop existing contacts policies
DROP POLICY IF EXISTS "Users can view contacts from accessible companies" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts for accessible companies" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts from accessible companies" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts from accessible companies" ON public.contacts;

-- Create permissive contacts policies
CREATE POLICY "Authenticated users can view contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL);

-- 4) Soft-delete, restore, list, and hard-delete helpers (SECURITY DEFINER)

-- Companies
CREATE OR REPLACE FUNCTION public.soft_delete_company(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.companies
  SET deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = _id AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_company(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_at timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT deleted_at INTO v_deleted_at FROM public.companies WHERE id = _id;
  IF v_deleted_at IS NULL THEN
    RETURN; -- nothing to restore
  END IF;
  IF v_deleted_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'Restore window expired';
  END IF;

  UPDATE public.companies
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_deleted_companies()
RETURNS SETOF public.companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT *
  FROM public.companies
  WHERE deleted_at IS NOT NULL
    AND deleted_at >= now() - interval '30 days'
  ORDER BY deleted_at DESC, name;
$$;

CREATE OR REPLACE FUNCTION public.hard_delete_old_companies()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH del AS (
    DELETE FROM public.companies
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*)::bigint FROM del;
$$;

-- Contacts
CREATE OR REPLACE FUNCTION public.soft_delete_contact(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.contacts
  SET deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = _id AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_contact(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_at timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT deleted_at INTO v_deleted_at FROM public.contacts WHERE id = _id;
  IF v_deleted_at IS NULL THEN
    RETURN; -- nothing to restore
  END IF;
  IF v_deleted_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'Restore window expired';
  END IF;

  UPDATE public.contacts
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_deleted_contacts(_company_id uuid DEFAULT NULL)
RETURNS SETOF public.contacts
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT *
  FROM public.contacts
  WHERE deleted_at IS NOT NULL
    AND deleted_at >= now() - interval '30 days'
    AND (_company_id IS NULL OR company_id = _company_id)
  ORDER BY deleted_at DESC, name;
$$;

CREATE OR REPLACE FUNCTION public.hard_delete_old_contacts()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH del AS (
    DELETE FROM public.contacts
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*)::bigint FROM del;
$$;